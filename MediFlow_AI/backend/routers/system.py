from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import database, schemas

router = APIRouter()

@router.get("/logs")
def get_agent_logs(db: Session = Depends(database.get_db)):
    return db.query(schemas.AgentLog).order_by(schemas.AgentLog.timestamp.desc()).limit(50).all()

@router.get("/kpis")
def get_kpis(db: Session = Depends(database.get_db)):
    total_patients = db.query(schemas.Patient).count()
    active_emergencies = db.query(schemas.Patient).filter(schemas.Patient.priority == "Emergency").count()
    doctors_avail = db.query(schemas.Doctor).filter(schemas.Doctor.status == "Available").count()
    beds_occupied = db.query(schemas.Bed).filter(schemas.Bed.status == "Occupied").count()
    
    return {
        "total_patients": total_patients,
        "active_emergencies": active_emergencies,
        "avg_wait_time": "15 mins",
        "doctors_available": doctors_avail,
        "beds_occupied": beds_occupied
    }
