from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, unique=True, index=True) # e.g. P-00123
    name = Column(String, index=True)
    age = Column(Integer)
    symptoms = Column(String)
    priority = Column(String) # Emergency, High, Normal
    status = Column(String) # Waiting, In Treatment, Admitted, Discharged
    assigned_doctor = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    specialization = Column(String)
    status = Column(String) # Available, Busy, Off-Duty
    current_patient_count = Column(Integer, default=0)

class Bed(Base):
    __tablename__ = "beds"

    id = Column(Integer, primary_key=True, index=True)
    bed_number = Column(String, unique=True, index=True)
    ward = Column(String)
    status = Column(String) # Available, Occupied, Reserved, Cleaning
    patient_id = Column(String, nullable=True) # ID of patient occupying

class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(Integer, primary_key=True, index=True)
    agent_name = Column(String) # Intake, Assignment, Diagnostic, Bed, Billing
    action_type = Column(String)
    message = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class DiagnosticTest(Base):
    __tablename__ = "diagnostic_tests"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True)
    patient_name = Column(String)
    test_name = Column(String)
    status = Column(String) # Pending, In Progress, Ready
    requested_at = Column(DateTime(timezone=True), server_default=func.now())

class Billing(Base):
    __tablename__ = "billing"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True)
    patient_name = Column(String)
    items = Column(String) # JSON or comma separated
    total_amount = Column(Integer)
    payment_status = Column(String) # Pending, Paid, Insurance
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
