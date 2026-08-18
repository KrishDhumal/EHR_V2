from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import database, schemas
from auth import security

router = APIRouter()


@router.get("/logs")
def get_agent_logs(db: Session = Depends(database.get_db),
                   _: schemas.User = Depends(security.require_roles("Admin"))):
    return db.query(schemas.AgentLog).order_by(schemas.AgentLog.timestamp.desc()).limit(100).all()


@router.get("/kpis")
def get_kpis(db: Session = Depends(database.get_db),
             user: schemas.User = Depends(security.get_current_user)):
    total_patients = security.scope_patients(db.query(schemas.Patient), user).count()
    active_emergencies = security.scope_patients(
        db.query(schemas.Patient).filter(schemas.Patient.priority == "Emergency"), user).count()
    waiting = security.scope_patients(
        db.query(schemas.Patient).filter(schemas.Patient.status.in_(["Waiting", "In Treatment"])), user).count()
    doctors_avail = db.query(schemas.Doctor).filter(schemas.Doctor.status == "Available").count()
    beds_occupied = db.query(schemas.Bed).filter(schemas.Bed.status == "Occupied").count()
    return {
        "total_patients": total_patients,
        "active_emergencies": active_emergencies,
        "avg_wait_time": "15 mins",
        "doctors_available": doctors_avail,
        "beds_occupied": beds_occupied,
        "in_queue": waiting,
    }


@router.get("/agent-stats")
def get_agent_stats(db: Session = Depends(database.get_db),
                    _: schemas.User = Depends(security.require_roles("Admin"))):
    rows = db.query(schemas.AgentLog.agent_name, func.count(schemas.AgentLog.id)).group_by(
        schemas.AgentLog.agent_name).all()
    return {"by_agent": {name: count for name, count in rows},
            "total_events": db.query(schemas.AgentLog).count()}


@router.get("/patient-flow")
def get_patient_flow(db: Session = Depends(database.get_db),
                     _: schemas.User = Depends(security.require_roles("Admin"))):
    statuses = ["Waiting", "In Treatment", "Admitted", "Discharged"]
    return [{"status": s,
             "count": db.query(schemas.Patient).filter(schemas.Patient.status == s).count()}
            for s in statuses]


@router.get("/analytics")
def get_analytics(db: Session = Depends(database.get_db),
                  _: schemas.User = Depends(security.require_roles("Admin"))):
    priorities = ["Emergency", "High", "Normal"]
    by_priority = [{"priority": p,
                    "count": db.query(schemas.Patient).filter(schemas.Patient.priority == p).count()}
                   for p in priorities]
    by_ward = [{"ward": ward,
                "count": db.query(schemas.Bed).filter(schemas.Bed.ward == ward).count()}
               for (ward,) in db.query(schemas.Bed.ward).distinct().all()]
    revenue = db.query(func.coalesce(func.sum(schemas.Billing.total_amount), 0)).scalar()
    return {"by_priority": by_priority, "by_ward": by_ward, "total_revenue": revenue}
