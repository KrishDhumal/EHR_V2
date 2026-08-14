from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import database, schemas
from pydantic import BaseModel

router = APIRouter()

@router.get("/")
def get_beds(db: Session = Depends(database.get_db)):
    return db.query(schemas.Bed).all()

# New endpoint to update bed status!
@router.patch("/{bed_id}/status")
def update_bed_status(bed_id: int, payload: dict, db: Session = Depends(database.get_db)):
    bed = db.query(schemas.Bed).filter(schemas.Bed.id == bed_id).first()
    if bed:
        bed.status = payload.get("status", bed.status)
        db.commit()
        db.refresh(bed)
    return bed