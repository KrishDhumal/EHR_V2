import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { apiFetch } from '../api';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { apiFetch('/system/logs').then(setLogs).catch((e) => setErr(e.message)); }, []);

  const filtered = logs.filter((l) =>
    !q || [l.agent_name, l.action_type, l.message, l.actor].join(' ').toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-5">Audit Log</h1>
      {err && <div className="text-red-600 bg-red-50 rounded p-2 mb-4 text-sm">{err}</div>}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter logs…"
          className="w-full pl-10 pr-3 py-2 border border-border-color rounded-lg bg-surface-primary text-text-primary outline-none focus:border-primary" />
      </div>
      <div className="glass-panel rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-text-secondary border-b border-border-color"><tr>{['When', 'Agent', 'Action', 'Actor', 'Message'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-b border-border-color/40">
                <td className="px-4 py-2 text-text-secondary whitespace-nowrap">{l.timestamp?.slice(0, 16).replace('T', ' ')}</td>
                <td className="px-4 py-2">{l.agent_name}</td>
                <td className="px-4 py-2"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">{l.action_type}</span></td>
                <td className="px-4 py-2 text-text-secondary">{l.actor || '—'}</td>
                <td className="px-4 py-2 text-text-primary">{l.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
