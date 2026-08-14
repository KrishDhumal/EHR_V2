from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import database, schemas

router = APIRouter()

@router.get("/")
def get_doctors(db: Session = Depends(database.get_db)):
    return db.query(schemas.Doctor).all()
