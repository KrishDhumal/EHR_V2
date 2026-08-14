"""
Patient Intake Agent - Uses Groq LLM to analyze symptoms and assign priority.
Falls back to a comprehensive rule-based logic if Groq key is not set.
"""
import os
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

GROQ_API_KEY = ""

# UPGRADED SYSTEM PROMPT
SYSTEM_PROMPT = """You are a hospital triage AI agent. Analyze the patient's symptoms and assign a priority level.

Rules:
- EMERGENCY: Chest pain, difficulty breathing, unconscious, severe bleeding, stroke symptoms, heart attack, trauma, stab wound, gunshot, active labor, hemorrhage, seizure
- HIGH: High fever (>102F), moderate pain, fracture, vomiting blood, severe headache, allergic reaction, accident, concussion
- NORMAL: Mild fever, cold/flu, minor cuts, routine checkup, mild pain, sprain

Respond with ONLY a JSON object in this exact format, nothing else:
{
  "priority": "Emergency" | "High" | "Normal",
  "reason": "one sentence explanation",
  "recommended_specialization": "Cardiology" | "Neurology" | "Orthopedics" | "Pediatrics" | "Maternity" | "Emergency" | "General"
}"""


def run_intake_agent(patient_name: str, age: int, symptoms: str) -> dict:
    if GROQ_API_KEY:
        try:
            llm = ChatGroq(
                model="llama-3.1-8b-instant",
                api_key=GROQ_API_KEY,
                temperature=0,
                max_tokens=200,
            )
            messages = [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=f"Patient: {patient_name}, Age: {age}\nSymptoms: {symptoms}")
            ]
            response = llm.invoke(messages)
            import json
            result = json.loads(response.content.strip())
            result["source"] = "groq_llm"
            return result
        except Exception as e:
            print(f"[IntakeAgent] Groq failed, using fallback: {e}")

    # Comprehensive Rule-based fallback
    return _rule_based_triage(symptoms)


def _rule_based_triage(symptoms: str) -> dict:
    s = symptoms.lower()

    # 1. SEVERITY KEYWORDS
    emergency_keywords = [
        "chest pain", "heart attack", "can't breathe", "difficulty breathing",
        "unconscious", "severe bleeding", "stroke", "trauma", "not breathing",
        "stab", "gunshot", "choking", "poison", "labor", "hemorrhage", "seizure", "overdose"
    ]
                          
    high_keywords = [
        "fever", "fracture", "vomiting blood", "severe headache", "allergic", 
        "high temperature", "cut", "bleeding", "broken", "accident", "head injury", "concussion", "burn"
    ]

    # 2. SPECIALIZATION KEYWORDS
    maternity_kw = ["pregnant", "pregnancy", "maternity", "labor", "contraction", "water broke", "prenatal"]
    pediatrics_kw = ["child", "baby", "kid", "infant", "toddler", "pediatric"]
    cardiology_kw = ["heart", "chest", "pulse", "palpitation", "cardiac", "blood pressure", "arrhythmia"]
    neurology_kw = ["headache", "stroke", "unconscious", "dizzy", "nerve", "brain", "head", "hemorrhage", "seizure", "numbness", "paralysis"]
    orthopedics_kw = ["bone", "broken", "fracture", "accident", "leg", "arm", "knee", "joint", "back pain", "spine", "sprain", "muscle", "hip"]

    # 3. ROUTING LOGIC: Find the best specialist
    spec = "General" # Default to General Physician
    
    if any(k in s for k in maternity_kw):
        spec = "Maternity"
    elif any(k in s for k in pediatrics_kw):
        spec = "Pediatrics"
    elif any(k in s for k in cardiology_kw):
        spec = "Cardiology"
    elif any(k in s for k in neurology_kw):
        spec = "Neurology"
    elif any(k in s for k in orthopedics_kw):
        spec = "Orthopedics"

    # 4. TRIAGE LOGIC: Assign priority and finalize routing
    if any(k in s for k in emergency_keywords):
        # If it's a severe trauma (like a stab wound) and no specific organ was matched, 
        # send them directly to the Emergency Room doctor.
        if spec == "General" and any(k in s for k in ["stab", "gunshot", "trauma", "bleeding", "poison", "overdose"]):
            spec = "Emergency"
            
        return {
            "priority": "Emergency",
            "reason": "Life-threatening condition or active trauma detected.",
            "recommended_specialization": spec,
            "source": "rule_based"
        }
        
    elif any(k in s for k in high_keywords):
        return {
            "priority": "High",
            "reason": "Symptoms require prompt medical attention.",
            "recommended_specialization": spec,
            "source": "rule_based"
        }
        
    else:
        return {
            "priority": "Normal",
            "reason": "Symptoms are non-critical. Routine care recommended.",
            "recommended_specialization": spec,
            "source": "rule_based"
        }