import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Loader2 } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuthStore } from '../store/useAuthStore';

const ROLES = ['Admin', 'Doctor', 'Nurse', 'Receptionist'];
const SPECIALIZATIONS = ['Cardiology', 'Neurology', 'Orthopedics', 'General', 'Pediatrics', 'Emergency', 'Maternity'];

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600 rounded-xl text-white"><Activity size={26} /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">MediFlow AI</h1>
            <p className="text-sm text-slate-500">Hospital Operations & EHR</p>
          </div>
        </div>

        <div className="flex mb-6 bg-slate-100 rounded-lg p-1">
          {['login', 'signup'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${mode === m ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
            >
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && (
            <input className="input" placeholder="Full name (e.g. Dr. Asha Rao)" value={form.full_name}
              onChange={set('full_name')} required />
          )}
          <input className="input" placeholder="User ID" value={form.username} onChange={set('username')} required />
          <input className="input" type="password" placeholder="Password" value={form.password}
            onChange={set('password')} required />

          {mode === 'signup' && (
            <>
              <select className="input" value={form.role} onChange={set('role')}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {form.role === 'Doctor' && (
                <select className="input" value={form.specialization} onChange={set('specialization')}>
                  {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </>
          )}

          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</div>}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60">
            {loading && <Loader2 className="animate-spin" size={18} />}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>

      <style>{`.input{width:100%;padding:0.6rem 0.85rem;border:1px solid #cbd5e1;border-radius:0.6rem;font-size:0.95rem;outline:none}.input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}`}</style>
    </div>
  );
}
