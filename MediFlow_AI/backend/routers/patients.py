from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import database, schemas
from pydantic import BaseModel
from typing import List, Optional
from agents.coordinator import run_coordinator
from auth import security
from patient_import import create_patient_with_history

router = APIRouter()


class PatientCreate(BaseModel):
    name: str
    age: int
    symptoms: str
    contact: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_id: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None


class PatientResponse(BaseModel):
    id: int
    patient_id: str
    name: str
    age: int
    symptoms: str
    priority: str
    status: str
    assigned_doctor: Optional[str] = None

    class Config:
        from_attributes = True


class PatientFullResponse(PatientResponse):
    suggested_tests: Optional[List[str]] = []
    bed_number: Optional[str] = None
    ward: Optional[str] = None
    triage_reason: Optional[str] = None


class ImportRequest(BaseModel):
    patients: List[dict]


@router.get("/", response_model=List[PatientResponse])
def get_patients(q: Optional[str] = None, skip: int = 0, limit: int = 200,
                 db: Session = Depends(database.get_db),
                 user: schemas.User = Depends(security.get_current_user)):
    query = db.query(schemas.Patient)
    query = security.scope_patients(query, user)
    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            schemas.Patient.name.ilike(term) | schemas.Patient.patient_id.ilike(term)
        )
    return query.order_by(schemas.Patient.id.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=PatientFullResponse)
def register_patient(patient: PatientCreate,
                     db: Session = Depends(database.get_db),
                     user: schemas.User = Depends(security.require_roles("Admin", "Receptionist"))):
    agent_results = run_coordinator(
        patient_name=patient.name, age=patient.age, symptoms=patient.symptoms, db_session=db)

    priority = agent_results["intake"]["priority"]
    doctor_name = agent_results["doctor"].get("doctor_name")
    bed_info = agent_results.get("bed", {})
    suggested_tests = agent_results.get("diagnostics", [])
    status = "In Treatment" if priority == "Emergency" else "Waiting"

    new_patient = schemas.Patient(
        name=patient.name, age=patient.age, symptoms=patient.symptoms,
        priority=priority, status=status, assigned_doctor=doctor_name,
        contact=patient.contact, date_of_birth=patient.date_of_birth, gender=patient.gender,
        blood_group=patient.blood_group, address=patient.address,
        emergency_contact_name=patient.emergency_contact_name,
        emergency_contact_phone=patient.emergency_contact_phone,
        insurance_provider=patient.insurance_provider, insurance_id=patient.insurance_id,
        allergies=patient.allergies, chronic_conditions=patient.chronic_conditions,
    )
    db.add(new_patient)
    db.flush()  # collision-proof MRN from the autoincrement PK
    new_patient.patient_id = f"P-{1000 + new_patient.id}"
    patient_id = new_patient.patient_id

    # Auto-open an encounter for this visit
    db.add(schemas.Encounter(patient_id=patient_id, encounter_type="OPD",
                             reason=patient.symptoms, attending_doctor=doctor_name, status="Open"))

    bed_number = bed_info.get("bed_number")
    if bed_number:
        assigned_bed = db.query(schemas.Bed).filter(schemas.Bed.bed_number == bed_number).first()
        if assigned_bed:
            assigned_bed.status = "Occupied"
            assigned_bed.patient_id = patient_id

    for t in db.query(schemas.DiagnosticTest).filter(
            schemas.DiagnosticTest.patient_name == patient.name,
            schemas.DiagnosticTest.patient_id == "PENDING").all():
        t.patient_id = patient_id

    db.add(schemas.AgentLog(agent_name="Registration", action_type="REGISTER",
                            message=f"Patient {patient.name} registered as {patient_id}.",
                            actor=user.full_name))
    db.commit()
    db.refresh(new_patient)

    return PatientFullResponse(
        id=new_patient.id, patient_id=new_patient.patient_id, name=new_patient.name,
        age=new_patient.age, symptoms=new_patient.symptoms, priority=new_patient.priority,
        status=new_patient.status, assigned_doctor=new_patient.assigned_doctor,
        suggested_tests=suggested_tests, bed_number=bed_info.get("bed_number"),
        ward=bed_info.get("ward"), triage_reason=agent_results["intake"].get("reason"))


@router.post("/import")
def import_patients(payload: ImportRequest,
                    db: Session = Depends(database.get_db),
                    user: schemas.User = Depends(security.require_roles("Admin", "Receptionist"))):
    created = 0
    for pdata in payload.patients:
        create_patient_with_history(db, pdata)
        created += 1
    db.add(schemas.AgentLog(agent_name="Import", action_type="IMPORT",
                            message=f"Bulk-imported {created} patient(s).", actor=user.full_name))
    db.commit()
    return {"message": f"Imported {created} patient(s).", "count": created}


@router.get("/queue", response_model=List[PatientResponse])
def get_queue(db: Session = Depends(database.get_db),
              user: schemas.User = Depends(security.get_current_user)):
    query = db.query(schemas.Patient).filter(
        schemas.Patient.status.in_(["Waiting", "In Treatment"]))
    query = security.scope_patients(query, user)
    return query.order_by(schemas.Patient.id.asc()).all()


@router.patch("/{patient_id}/discharge")
def discharge_patient(patient_id: str,
                      db: Session = Depends(database.get_db),
                      user: schemas.User = Depends(security.require_roles("Admin", "Doctor", "Nurse"))):
    patient = db.query(schemas.Patient).filter(schemas.Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    security.authorize_patient(patient, user)

    patient.status = "Discharged"

    bed = db.query(schemas.Bed).filter(schemas.Bed.patient_id == patient_id).first()
    if bed:
        bed.status = "Cleaning"
        bed.patient_id = None

    if patient.assigned_doctor:
        doctor = db.query(schemas.Doctor).filter(schemas.Doctor.name == patient.assigned_doctor).first()
        if doctor and (doctor.current_patient_count or 0) > 0:
            doctor.current_patient_count -= 1

    tests = db.query(schemas.DiagnosticTest).filter(
        schemas.DiagnosticTest.patient_id == patient_id).all()
    items = ["Doctor Consultation (Rs. 500)"]
    total_cost = 500
    for t in tests:
        items.append(f"{t.test_name} (Rs. 800)")
        total_cost += 800

    db.add(schemas.Billing(
        patient_id=patient.patient_id, patient_name=patient.name,
        items=", ".join(items), total_amount=total_cost, payment_status="Pending"))

    db.add(schemas.ClinicalNote(
        patient_id=patient.patient_id, note_type="Discharge", author=user.full_name,
        content=f"Patient discharged by {user.full_name}. Final bill Rs. {total_cost}."))

    db.add(schemas.AgentLog(
        agent_name="Billing & Discharge", action_type="DISCHARGE",
        message=f"Patient {patient.name} discharged. Bill: Rs. {total_cost}.",
        actor=user.full_name))

    db.commit()
    return {"message": f"Patient {patient.name} discharged successfully."}
