import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { apiFetch } from '../api';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Reports() {
  const [flow, setFlow] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    apiFetch('/system/patient-flow').then(setFlow).catch((e) => setErr(e.message));
    apiFetch('/system/analytics').then(setAnalytics).catch((e) => setErr(e.message));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-5">Reports & Analytics</h1>
      {err && <div className="text-red-600 bg-red-50 rounded p-2 mb-4 text-sm">{err}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-panel rounded-xl p-4" style={{ height: 300 }}>
          <div className="font-semibold mb-2 text-text-primary">Patient Flow</div>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={flow}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="status" /><YAxis /><Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {analytics && (
          <div className="glass-panel rounded-xl p-4" style={{ height: 300 }}>
            <div className="font-semibold mb-2 text-text-primary">By Priority</div>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie data={analytics.by_priority} dataKey="count" nameKey="priority" outerRadius={90} label>
                  {analytics.by_priority.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {analytics && (
          <div className="glass-panel rounded-xl p-4" style={{ height: 300 }}>
            <div className="font-semibold mb-2 text-text-primary">Beds by Ward</div>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={analytics.by_ward}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="ward" /><YAxis /><Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {analytics && (
          <div className="glass-panel rounded-xl p-4 flex flex-col justify-center items-center">
            <div className="text-text-secondary text-sm">Total Revenue</div>
            <div className="text-4xl font-bold text-primary mt-2">₹ {analytics.total_revenue?.toLocaleString('en-IN')}</div>
          </div>
        )}
      </div>
    </div>
  );
}
