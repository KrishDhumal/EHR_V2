from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import database, schemas
from pydantic import BaseModel

router = APIRouter()

class DiagnosticCreate(BaseModel):
    patient_id: str
    patient_name: str
    test_name: str

@router.get("/")
def get_diagnostics(db: Session = Depends(database.get_db)):
    return db.query(schemas.DiagnosticTest).all()

@router.post("/")
def schedule_diagnostic(test: DiagnosticCreate, db: Session = Depends(database.get_db)):
    new_test = schemas.DiagnosticTest(**test.dict(), status="Pending")
    db.add(new_test)
    
    # Log Agent Action
    db.add(schemas.AgentLog(agent_name="Diagnostic", action_type="SCHEDULE", message=f"Scheduled {test.test_name} for {test.patient_name}."))
    db.commit()
    db.refresh(new_test)
    return new_test

@router.patch("/{test_id}/status")
def update_test_status(test_id: int, payload: dict, db: Session = Depends(database.get_db)):
    test = db.query(schemas.DiagnosticTest).filter(schemas.DiagnosticTest.id == test_id).first()
    if not test:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Test not found")
    test.status = payload.get("status", test.status)
    db.add(schemas.AgentLog(agent_name="Diagnostic", action_type="UPDATE", message=f"Test '{test.test_name}' for {test.patient_name} updated to {test.status}."))
    db.commit()
    db.refresh(test)
    return test
