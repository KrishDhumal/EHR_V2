from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import database, schemas

router = APIRouter()

@router.get("/")
def get_billing(db: Session = Depends(database.get_db)):
    # Simply fetch real bills from the database, newest first
    return db.query(schemas.Billing).order_by(schemas.Billing.id.desc()).all()

@router.patch("/{bill_id}/pay")
def pay_bill(bill_id: int, db: Session = Depends(database.get_db)):
    # New endpoint to handle the "Clear Dues" button!
    bill = db.query(schemas.Billing).filter(schemas.Billing.id == bill_id).first()
    if bill:
        bill.payment_status = "Paid"
        db.commit()
        db.refresh(bill)
    return bill