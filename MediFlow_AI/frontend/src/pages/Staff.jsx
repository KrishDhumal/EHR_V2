import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { useAuthStore } from '../store/useAuthStore';

const ROLES = ['Admin', 'Doctor', 'Nurse', 'Receptionist'];

export default function Staff() {
  const me = useAuthStore((s) => s.user);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', full_name: '', password: '', role: 'Nurse', specialization: 'General' });
  const [msg, setMsg] = useState(null);

  const load = async () => { try { setUsers(await apiFetch('/auth/users')); } catch (e) { setMsg({ type: 'err', text: e.message }); } };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault(); setMsg(null);
    try {
      await apiFetch('/auth/users', { method: 'POST', body: JSON.stringify(form) });
      setForm({ username: '', full_name: '', password: '', role: 'Nurse', specialization: 'General' });
      setMsg({ type: 'ok', text: 'User created.' }); load();
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  };
  const toggle = async (u) => { await apiFetch(`/auth/users/${u.id}/active`, { method: 'PATCH', body: JSON.stringify({ is_active: !u.is_active }) }); load(); };
  const del = async (u) => { if (confirm(`Delete ${u.username}?`)) { await apiFetch(`/auth/users/${u.id}`, { method: 'DELETE' }); load(); } };
  const reset = async (u) => {
    const pw = prompt(`New password for ${u.username} (min 8):`);
    if (pw) { try { await apiFetch(`/auth/users/${u.id}/reset-password`, { method: 'POST', body: JSON.stringify({ new_password: pw }) }); setMsg({ type: 'ok', text: 'Password reset.' }); } catch (e) { setMsg({ type: 'err', text: e.message }); } }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-5">Staff & Access</h1>
      {msg && <div className={`mb-4 text-sm rounded p-2 ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}

      <form onSubmit={create} className="glass-panel rounded-xl p-4 mb-5 grid md:grid-cols-6 gap-2 items-end">
        <input className="fld" placeholder="User ID" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        <input className="fld" placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        <input className="fld" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <select className="fld" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
        {form.role === 'Doctor'
          ? <input className="fld" placeholder="Specialization" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
          : <div />}
        <button className="btn-blue">Create user</button>
      </form>

      <div className="glass-panel rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-text-secondary border-b border-border-color"><tr>{['User ID', 'Name', 'Role', 'Active', 'Actions'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border-color/40">
                <td className="px-4 py-3 font-mono">{u.username}</td>
                <td className="px-4 py-3 text-text-primary">{u.full_name}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">{u.is_active ? '✅' : '⛔'}</td>
                <td className="px-4 py-3 space-x-3 text-xs">
                  {u.id !== me?.id && <button onClick={() => toggle(u)} className="text-amber-600 hover:underline">{u.is_active ? 'Deactivate' : 'Activate'}</button>}
                  <button onClick={() => reset(u)} className="text-blue-600 hover:underline">Reset password</button>
                  {u.id !== me?.id && <button onClick={() => del(u)} className="text-red-600 hover:underline">Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`.fld{padding:.5rem .7rem;border:1px solid #cbd5e1;border-radius:.5rem;font-size:.9rem}.btn-blue{padding:.5rem .85rem;background:#2563eb;color:#fff;border-radius:.6rem;font-size:.9rem;font-weight:500}`}</style>
    </div>
  );
}
