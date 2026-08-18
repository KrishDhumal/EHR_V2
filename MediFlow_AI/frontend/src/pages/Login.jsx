import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Loader2, ShieldCheck, Stethoscope, ClipboardList } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuthStore } from '../store/useAuthStore';

const ROLES = ['Admin', 'Doctor', 'Nurse', 'Receptionist'];
const SPECIALIZATIONS = ['Cardiology', 'Neurology', 'Orthopedics', 'General', 'Pediatrics', 'Emergency', 'Maternity'];

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    username: '', password: '', full_name: '', role: 'Doctor', specialization: 'General',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: form.username, password: form.password }),
        });
        setAuth(data.access_token, data.user);
      } else {
        const body = {
          username: form.username, full_name: form.full_name,
          password: form.password, role: form.role,
          specialization: form.role === 'Doctor' ? form.specialization : null,
        };
        const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) });
        setAuth(data.access_token, data.user);
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-12">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/15 rounded-xl"><Activity size={26} /></div>
          <span className="text-xl font-bold tracking-tight">MediFlow AI</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight" style={{ color: '#ffffff' }}>Hospital operations,<br />intelligently orchestrated.</h1>
          <p className="mt-4 text-blue-100 max-w-md">
            AI-assisted triage, a complete electronic health record, and role-based access — in one secure platform.
          </p>
          <ul className="mt-8 space-y-3 text-blue-50">
            <li className="flex items-center gap-3"><Stethoscope size={18} className="text-blue-200" /> AI agents triage, route and assign in seconds</li>
            <li className="flex items-center gap-3"><ClipboardList size={18} className="text-blue-200" /> Longitudinal records with clinical safety checks</li>
            <li className="flex items-center gap-3"><ShieldCheck size={18} className="text-blue-200" /> Encrypted PHI and role-based access control</li>
          </ul>
        </div>
        <p className="text-xs text-blue-200">© {new Date().getFullYear()} MediFlow AI · For demonstration use</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="p-2 bg-blue-600 rounded-xl text-white"><Activity size={24} /></div>
            <span className="text-xl font-bold text-slate-800">MediFlow AI</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            {mode === 'login' ? 'Sign in to continue to your dashboard.' : 'Set up access to MediFlow AI.'}
          </p>

          <div className="flex mb-6 bg-slate-100 rounded-lg p-1">
            {['login', 'signup'].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${mode === m ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <Field label="Full name">
                <input className="input" placeholder="e.g. Dr. Asha Rao" value={form.full_name} onChange={set('full_name')} required />
              </Field>
            )}
            <Field label="User ID">
              <input className="input" placeholder="your.username" value={form.username} onChange={set('username')} required />
            </Field>
            <Field label="Password">
              <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
            </Field>

            {mode === 'signup' && (
              <div className={`grid gap-4 ${form.role === 'Doctor' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <Field label="Role">
                  <select className="input" value={form.role} onChange={set('role')}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                {form.role === 'Doctor' && (
                  <Field label="Specialization">
                    <select className="input" value={form.specialization} onChange={set('specialization')}>
                      {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                )}
              </div>
            )}

            {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-2.5">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60 transition">
              {loading && <Loader2 className="animate-spin" size={18} />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .input{width:100%;padding:0.6rem 0.85rem;border:1px solid #cbd5e1;border-radius:0.6rem;font-size:0.95rem;outline:none;background:#fff;color:#0f172a;transition:border-color .15s, box-shadow .15s}
        .input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
