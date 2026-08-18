"""AI assistant endpoints: per-patient recommendations and the MediBot chat."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models import database, schemas
from auth import security
import ai

router = APIRouter()


def _patient_or_404(patient_id, db) -> schemas.Patient:
    p = db.query(schemas.Patient).filter(schemas.Patient.patient_id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    return p


def _summary(p, db) -> str:
    meds = [m.medication for m in db.query(schemas.Prescription).filter(
        schemas.Prescription.patient_id == p.patient_id,
        schemas.Prescription.status == "Active").all()]
    dxs = [d.description for d in db.query(schemas.Diagnosis).filter(
        schemas.Diagnosis.patient_id == p.patient_id).all()]
    return (
        f"Patient {p.patient_id} — {p.name}, age {p.age}, {p.gender or 'unknown gender'}. "
        f"Priority: {p.priority}. Presenting symptoms: {p.symptoms or 'n/a'}. "
        f"Allergies: {p.allergies or 'none'}. Chronic conditions: {p.chronic_conditions or 'none'}. "
        f"Active medications: {', '.join(meds) or 'none'}. Known diagnoses: {', '.join(dxs) or 'none'}."
    )


@router.post("/recommend/{patient_id}")
def recommend(patient_id: str,
              db: Session = Depends(database.get_db),
              user: schemas.User = Depends(security.require_roles("Admin", "Doctor", "Nurse"))):
    patient = _patient_or_404(patient_id, db)
    security.authorize_patient(patient, user)
    if not ai.available():
        raise HTTPException(status_code=503, detail="AI is not configured (no GROQ_API_KEY set).")
    prompt = _summary(patient, db) + "\n\nProvide clinical recommendations for this presentation."
    try:
        text = ai.ask(ai.RECOMMEND_SYSTEM, [("user", prompt)], max_tokens=1200, temperature=0.2)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI request failed: {exc}")
    db.add(schemas.AgentLog(
        agent_name="AI Assist", action_type="RECOMMEND",
        message=f"AI diagnosis recommendation generated for {patient_id}.",
        actor=user.full_name,
    ))
    db.commit()
    return {"recommendation": text, "disclaimer": ai.DISCLAIMER}


class ChatTurn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatTurn] = []
    patient_id: Optional[str] = None


@router.post("/chat")
def chat(payload: ChatRequest,
         db: Session = Depends(database.get_db),
         user: schemas.User = Depends(security.get_current_user)):
    if not ai.available():
        raise HTTPException(status_code=503, detail="AI is not configured (no GROQ_API_KEY set).")
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    system = ai.CHAT_SYSTEM
    if payload.patient_id:
        p = db.query(schemas.Patient).filter(schemas.Patient.patient_id == payload.patient_id).first()
        if p and security.can_access_patient(p, user):
            system = system + "\n\nCurrent patient context:\n" + _summary(p, db)
    turns = [(t.role, t.content) for t in (payload.history or [])[-8:]]
    turns.append(("user", payload.message))
    try:
        reply = ai.ask(system, turns, max_tokens=1200, temperature=0.4)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI request failed: {exc}")
    return {"reply": reply}
