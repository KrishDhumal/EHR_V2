from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import database, schemas
from pydantic import BaseModel
from typing import List, Optional
from agents.coordinator import run_coordinator

router = APIRouter()

class PatientCreate(BaseModel):
    name: str
    age: int
    symptoms: str
    contact: Optional[str] = None

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
        orm_mode = True

class PatientFullResponse(PatientResponse):
    suggested_tests: Optional[List[str]] = []
    bed_number: Optional[str] = None
    ward: Optional[str] = None
    triage_reason: Optional[str] = None

@router.get("/", response_model=List[PatientResponse])
def get_patients(db: Session = Depends(database.get_db)):
    return db.query(schemas.Patient).order_by(schemas.Patient.id.desc()).all()

@router.post("/", response_model=PatientFullResponse)
def register_patient(patient: PatientCreate, db: Session = Depends(database.get_db)):
    count = db.query(schemas.Patient).count()
    patient_id = f"P-{1000 + count}"

    agent_results = run_coordinator(
        patient_name=patient.name,
        age=patient.age,
        symptoms=patient.symptoms,
        db_session=db
    )

    priority = agent_results["intake"]["priority"]
    doctor_name = agent_results["doctor"].get("doctor_name")
    bed_info = agent_results.get("bed", {})
    suggested_tests = agent_results.get("diagnostics", [])

    status = "In Treatment" if priority == "Emergency" else "Waiting"

    new_patient = schemas.Patient(
        patient_id=patient_id,
        name=patient.name,
        age=patient.age,
        symptoms=patient.symptoms,
        priority=priority,
        status=status,
        assigned_doctor=doctor_name
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    # 🔥 CRITICAL FIX: Actually mark the bed as Occupied in the DB!
    bed_number = bed_info.get("bed_number")
    if bed_number:
        assigned_bed = db.query(schemas.Bed).filter(schemas.Bed.bed_number == bed_number).first()
        if assigned_bed:
            assigned_bed.status = "Occupied"
            assigned_bed.patient_id = patient.name
            db.commit()

    pending_tests = db.query(schemas.DiagnosticTest).filter(
        schemas.DiagnosticTest.patient_name == patient.name,
        schemas.DiagnosticTest.patient_id == "PENDING"
    ).all()
    for t in pending_tests:
        t.patient_id = patient_id
    db.commit()

    return PatientFullResponse(
        id=new_patient.id,
        patient_id=new_patient.patient_id,
        name=new_patient.name,
        age=new_patient.age,
        symptoms=new_patient.symptoms,
        priority=new_patient.priority,
        status=new_patient.status,
        assigned_doctor=new_patient.assigned_doctor,
        suggested_tests=suggested_tests,
        bed_number=bed_info.get("bed_number"),
        ward=bed_info.get("ward"),
        triage_reason=agent_results["intake"].get("reason")
    )

@router.get("/queue", response_model=List[PatientResponse])
def get_queue(db: Session = Depends(database.get_db)):
    return db.query(schemas.Patient).filter(
        schemas.Patient.status.in_(["Waiting", "In Treatment"])
    ).order_by(schemas.Patient.id.asc()).all()

@router.patch("/{patient_id}/discharge")
def discharge_patient(patient_id: str, db: Session = Depends(database.get_db)):
    patient = db.query(schemas.Patient).filter(schemas.Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    patient.status = "Discharged"
    
    # Free up the bed
    bed = db.query(schemas.Bed).filter(schemas.Bed.patient_id == patient.name).first()
    if bed:
        bed.status = "Cleaning"
        bed.patient_id = None
        
    # Free up the Doctor
    if patient.assigned_doctor:
        doctor = db.query(schemas.Doctor).filter(schemas.Doctor.name == patient.assigned_doctor).first()
        if doctor and doctor.current_patient_count > 0:
            doctor.current_patient_count -= 1

    # Autogenerate Bill
    tests = db.query(schemas.DiagnosticTest).filter(schemas.DiagnosticTest.patient_id == patient_id).all()
    items = ["Doctor Consultation (Rs. 500)"]
    total_cost = 500
    for t in tests:
        items.append(f"{t.test_name} (Rs. 800)")
        total_cost += 800
        
    new_bill = schemas.Billing(
        patient_id=patient.patient_id,
        patient_name=patient.name,
        items=", ".join(items),
        total_amount=total_cost,
        payment_status="Pending"
    )
    db.add(new_bill)

    db.add(schemas.AgentLog(
        agent_name="Billing & Discharge",
        action_type="DISCHARGE",
        message=f"Patient {patient.name} discharged. Bill: Rs. {total_cost}."
    ))
    
    db.commit()
    return {"message": f"Patient {patient.name} discharged successfully."}