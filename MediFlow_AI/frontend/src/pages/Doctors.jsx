import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stethoscope, UserCircle, Clock, ChevronRight, X } from 'lucide-react';

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [doctorQueue, setDoctorQueue] = useState([]);

  const openQueue = (doc) => {
    setSelectedDoctor(doc);
    fetch('http://localhost:8000/api/patients/queue')
      .then(res => res.json())
      .then(data => {
        const queue = Array.isArray(data) ? data.filter(p => p.assigned_doctor === doc.name) : [];
        setDoctorQueue(queue);
        setIsQueueOpen(true);
      })
      .catch(console.error);
  };

  const markAsDone = (patientId) => {
    fetch(`http://localhost:8000/api/patients/${patientId}/discharge`, {
      method: 'PATCH',
    })
      .then(res => res.json())
      .then(() => {
        // 1. Remove the patient from the open queue sidebar
        setDoctorQueue(prev => prev.filter(p => p.patient_id !== patientId));
        
        // 2. Update the background card's patient count
        setDoctors(prevDoctors => 
          prevDoctors.map(doc => 
            doc.name === selectedDoctor.name 
              ? { ...doc, current_patient_count: Math.max(0, doc.current_patient_count - 1) } 
              : doc
          )
        );
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetch('http://localhost:8000/api/doctors/')
      .then(res => res.json())
      .then(data => { setDoctors(Array.isArray(data) ? data : []); setLoading(false); })
      .catch((err) => { console.error(err); setLoading(false); });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Stethoscope className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">Doctor & Queue Management</h1>
          <p className="text-text-secondary">Doctor Assignment Agent Orchestration</p>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-surface-secondary rounded-2xl w-full"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {doctors.map((doc, i) => (
              <motion.div 
                key={doc.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`glass-panel p-6 rounded-2xl shadow-sm border-t-4 hover:-translate-y-1 transition-transform bg-surface`}
                style={{ borderTopColor: doc.status === 'Available' ? 'rgb(var(--color-success))' : doc.status === 'Busy' ? 'rgb(var(--color-warning))' : 'rgb(var(--color-text-secondary))' }}
              >
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center space-x-3">
                      <UserCircle className="w-10 h-10 text-primary" />
                      <div>
                        <h3 className="font-bold text-lg text-text-primary">{doc.name}</h3>
                        <p className="text-xs text-text-secondary font-medium tracking-wide uppercase">{doc.specialization}</p>
                      </div>
                   </div>
                   <span className={`px-2 py-1 text-xs font-bold rounded-md ${
                     doc.status === 'Available' ? 'bg-success/10 text-success' : 
                     doc.status === 'Busy' ? 'bg-warning/10 text-warning' : 'bg-surface-secondary text-text-secondary'
                   }`}>
                     {doc.status}
                   </span>
                </div>
                
                <div className="bg-surface-secondary rounded-xl p-4 flex items-center justify-between">
                   <div className="flex items-center space-x-2">
                     <Clock className="w-4 h-4 text-text-secondary" />
                     <span className="text-sm font-medium text-text-primary">Current Queue</span>
                   </div>
                   <div className="text-xl font-bold font-mono text-primary">{doc.current_patient_count}</div>
                </div>

                <button onClick={() => openQueue(doc)} className="mt-4 w-full flex items-center justify-center py-2.5 rounded-lg border border-primary/20 text-primary hover:bg-primary/5 transition-colors font-medium text-sm cursor-pointer">
                  Manage Queue <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      {isQueueOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 flex justify-end" onClick={() => setIsQueueOpen(false)}>
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-full bg-surface glass-panel shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6 border-b border-border-color flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-text-primary">Queue for {selectedDoctor?.name}</h2>
                <p className="text-sm text-text-secondary">Manage assigned patients</p>
              </div>
              <button onClick={() => setIsQueueOpen(false)} className="p-2 hover:bg-surface-secondary rounded-full cursor-pointer text-text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {doctorQueue.length === 0 ? (
                <p className="text-center text-text-secondary py-10">No patients in queue for this doctor</p>
              ) : (
                doctorQueue.map(p => (
                  <div key={p.id} className="bg-surface-secondary p-4 rounded-xl border border-border-color">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-mono text-xs text-primary mb-1">{p.patient_id}</div>
                        <h4 className="font-bold text-text-primary">{p.name}</h4>
                      </div>
                      <span className={`px-2 py-1 text-xs font-bold rounded-md ${p.priority === 'Emergency' ? 'bg-error/10 text-error' : p.priority === 'High' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                        {p.priority}
                      </span>
                    </div>
                    <div className="text-sm text-text-secondary mb-4">
                      Status: <span className="font-medium text-text-primary">{p.status}</span>
                    </div>
                    <button onClick={() => markAsDone(p.patient_id)} className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium rounded-lg transition-colors cursor-pointer">
                      Mark as Done
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
export default Doctors;
