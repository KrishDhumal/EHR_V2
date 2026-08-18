import React, { useState } from 'react';
import { rawFetch } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Sparkles, AlertCircle, CheckCircle, FlaskConical, BedDouble, Stethoscope } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api';

const Registration = () => {
  const [formData, setFormData] = useState({ name: '', age: '', contact: '', symptoms: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await rawFetch(`/patients/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          age: parseInt(formData.age),
          symptoms: formData.symptoms,
          contact: formData.contact,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Registration failed');
      }

      const data = await response.json();
      setResult(data);
      setFormData({ name: '', age: '', contact: '', symptoms: '' });
    } catch (err) {
      setError(err.message || 'Could not connect to backend. Make sure the FastAPI server is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityColor = {
    Emergency: { bg: 'bg-emergency', border: 'var(--color-emergency)', text: 'text-white' },
    High: { bg: 'bg-warning', border: 'var(--color-warning)', text: 'text-white' },
    Normal: { bg: 'bg-success', border: 'var(--color-success)', text: 'text-white' },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <UserPlus className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">Patient Registration</h1>
          <p className="text-text-secondary">AI Coordinator Agent — Real-time agentic pipeline</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="glass-panel p-8 rounded-2xl shadow-sm"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Full Name</label>
              <input required type="text" name="name" value={formData.name} onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-border-color bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)] transition-all"
                placeholder="e.g. Ravi Sharma" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Age</label>
                <input required type="number" name="age" value={formData.age} onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-border-color bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)] transition-all"
                  placeholder="34" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Contact</label>
                <input type="text" name="contact" value={formData.contact} onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-border-color bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)] transition-all"
                  placeholder="+91 9876543210" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Symptoms & Notes</label>
              <textarea required name="symptoms" rows="4" value={formData.symptoms} onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-border-color bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)] transition-all resize-none"
                placeholder="Describe symptoms in detail, e.g. 'chest pain and difficulty breathing for 2 hours'"></textarea>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-emergency bg-emergency/10 border border-emergency/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              disabled={isSubmitting}
              className="w-full py-3 bg-primary text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Running AI Agent Pipeline...</span>
                </>
              ) : (
                <><Sparkles className="w-4 h-4" /> Submit for AI Triage</>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Result Panel */}
        <div>
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="glass-panel p-8 rounded-2xl shadow-sm border-t-4"
                style={{ borderTopColor: priorityColor[result.priority]?.border || 'var(--color-primary)' }}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-success" /> Patient Registered
                    </h3>
                    <p className="text-sm text-text-secondary mt-1">All AI Agents Completed ✓</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm font-bold text-white ${priorityColor[result.priority]?.bg} ${result.priority === 'Emergency' ? 'animate-pulse' : ''}`}>
                    {result.priority}
                  </span>
                </div>

                {/* IDs */}
                <div className="bg-surface-secondary p-5 rounded-xl space-y-3 mb-4">
                  <div className="flex justify-between items-center border-b border-border-color pb-3">
                    <span className="text-text-secondary text-sm">Patient ID</span>
                    <span className="font-mono font-bold text-lg text-text-primary">{result.patient_id}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border-color pb-3">
                    <span className="text-text-secondary text-sm">Status</span>
                    <span className="font-semibold text-text-primary">{result.status}</span>
                  </div>
                  {result.assigned_doctor && (
                    <div className="flex justify-between items-center border-b border-border-color pb-3">
                      <span className="text-text-secondary text-sm flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5" /> Doctor</span>
                      <span className="font-semibold text-primary">{result.assigned_doctor}</span>
                    </div>
                  )}
                  {result.bed_number && (
                    <div className="flex justify-between items-center border-b border-border-color pb-3">
                      <span className="text-text-secondary text-sm flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> Bed Assigned</span>
                      <span className="font-semibold text-secondary">{result.bed_number} ({result.ward})</span>
                    </div>
                  )}
                  {result.suggested_tests && result.suggested_tests.length > 0 && (
                    <div className="flex justify-between items-start">
                      <span className="text-text-secondary text-sm flex items-center gap-1 mt-1"><FlaskConical className="w-3.5 h-3.5" /> Tests</span>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                        {result.suggested_tests.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded font-medium">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Triage reason */}
                {result.triage_reason && (
                  <div className="flex gap-2 text-sm text-text-secondary p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{result.triage_reason}</span>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                className="h-full flex items-center justify-center border-2 border-dashed border-border-color rounded-2xl p-8 text-center bg-surface/50 min-h-[300px]"
              >
                <div>
                  <Sparkles className="w-12 h-12 text-text-secondary mx-auto mb-4 opacity-40" />
                  <h3 className="text-lg font-medium text-text-primary">AI Agent Pipeline Ready</h3>
                  <p className="text-sm text-text-secondary mt-2 max-w-xs mx-auto">
                    On submission, 4 AI agents will run in sequence — Intake → Doctor → Diagnostics → Bed.
                  </p>
                  <div className="mt-4 flex flex-col gap-1.5 text-xs text-text-secondary">
                    {['🧠 Intake Agent (Groq LLM)', '👨‍⚕️ Doctor Assignment Agent', '🔬 Diagnostic Agent', '🛏️ Bed Management Agent'].map(a => (
                      <span key={a} className="px-3 py-1 bg-surface-secondary rounded-full">{a}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Registration;
