import contextlib
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import database, schemas
from routers import patients, system, doctors, beds, diagnostics, billing

# Load .env file (GROQ_API_KEY etc.)
load_dotenv()

# Create database tables
schemas.Base.metadata.create_all(bind=database.engine)

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    db = database.SessionLocal()
    with db:
        if not db.query(schemas.Doctor).first():
            db.add_all([
                schemas.Doctor(name="Dr. Sharma", specialization="Cardiology", status="Available", current_patient_count=0),
                schemas.Doctor(name="Dr. Patel", specialization="Neurology", status="Available", current_patient_count=0),
                schemas.Doctor(name="Dr. Oberoi", specialization="Orthopedics", status="Available", current_patient_count=0),
                schemas.Doctor(name="Dr. Gupta", specialization="General", status="Available", current_patient_count=0),
                schemas.Doctor(name="Dr. Reddy", specialization="Pediatrics", status="Available", current_patient_count=0),
                schemas.Doctor(name="Dr. Mehta", specialization="Emergency", status="Available", current_patient_count=0),
            ])
            db.commit()

        if not db.query(schemas.Bed).first():
            beds_list = []
            for w in ["General", "ICU", "Maternity"]:
                for i in range(1, 7):
                    # We removed the dummy Occupied/Cleaning logic!
                    beds_list.append(schemas.Bed(bed_number=f"{w[0]}-{100+i}", ward=w, status="Available"))
            db.add_all(beds_list)
            db.commit()
    yield

app = FastAPI(title="MediFlow AI API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router, prefix="/api/patients", tags=["Patients (Intake Agent)"])
app.include_router(system.router, prefix="/api/system", tags=["System (Coordinator Agent)"])
app.include_router(doctors.router, prefix="/api/doctors", tags=["Doctors Agent"])
app.include_router(beds.router, prefix="/api/beds", tags=["Bed Management Agent"])
app.include_router(diagnostics.router, prefix="/api/diagnostics", tags=["Diagnostics Agent"])
app.include_router(billing.router, prefix="/api/billing", tags=["Billing Agent"])

@app.get("/")
def read_root():
    groq_status = "✅ Connected" if os.getenv("GROQ_API_KEY") else "⚠️ Not set (using rule-based fallback)"
    return {
        "message": "Welcome to MediFlow AI API",
        "groq_status": groq_status,
        "docs": "/docs"
    }
