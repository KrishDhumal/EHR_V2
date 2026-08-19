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


@router.post("/summary/{patient_id}")
def grounded_summary(patient_id: str,
                     db: Session = Depends(database.get_db),
                     user: schemas.User = Depends(security.require_roles("Admin", "Doctor", "Nurse"))):
    """A grounded chart summary: the LLM may ONLY use numbered structured facts,
    and must cite the fact ID behind every statement — so it can't hallucinate."""
    patient = _patient_or_404(patient_id, db)
    security.authorize_patient(patient, user)
    if not ai.available():
        raise HTTPException(status_code=503, detail="AI is not configured (no GROQ_API_KEY set).")

    facts = []

    def add(prefix, text):
        n = sum(1 for f in facts if f["id"].startswith(prefix)) + 1
        facts.append({"id": f"{prefix}{n}", "text": text})

    add("P", f"{patient.name}, age {patient.age}, {patient.gender or 'unknown gender'}; "
             f"priority {patient.priority}, status {patient.status}.")
    if (patient.allergies or "").strip():
        add("A", f"Allergy: {patient.allergies}.")
    if (patient.chronic_conditions or "").strip():
        add("C", f"Chronic condition: {patient.chronic_conditions}.")
    for d in db.query(schemas.Diagnosis).filter(schemas.Diagnosis.patient_id == patient_id).all():
        add("D", f"Diagnosis: {d.description} ({d.status}).")
    for m in db.query(schemas.Prescription).filter(
            schemas.Prescription.patient_id == patient_id, schemas.Prescription.status == "Active").all():
        add("M", f"Active medication: {m.medication} {m.dosage or ''} {m.frequency or ''}".strip() + ".")
    latest = (db.query(schemas.Vitals).filter(schemas.Vitals.patient_id == patient_id)
              .order_by(schemas.Vitals.id.desc()).first())
    if latest:
        add("V", f"Latest vitals — HR {latest.heart_rate}, BP {latest.systolic_bp}/{latest.diastolic_bp}, "
                 f"SpO2 {latest.spo2}, temp {latest.temperature_c}.")
    add("E", f"{db.query(schemas.Encounter).filter(schemas.Encounter.patient_id == patient_id).count()} recorded encounter(s).")

    facts_text = "\n".join(f"[{f['id']}] {f['text']}" for f in facts)
    system = (
        "You are a clinical summariser. Write a concise 3–5 sentence summary of the patient using ONLY the "
        "numbered facts below. After EVERY statement, cite the fact ID(s) it is based on in square brackets, "
        "e.g. [D1] or [M2][M3]. Do NOT include anything not present in the facts, and never invent values.\n\n"
        "FACTS:\n" + facts_text
    )
    try:
        text = ai.ask(system, [("user", "Summarise this patient's current status.")], max_tokens=1200, temperature=0.1)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI request failed: {exc}")

    db.add(schemas.AgentLog(agent_name="AI Assist", action_type="SUMMARY",
                            message=f"Grounded chart summary generated for {patient_id}.", actor=user.full_name))
    db.commit()
    return {"summary": text, "facts": facts, "disclaimer": ai.DISCLAIMER}


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
