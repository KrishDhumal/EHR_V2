import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, X, Send, SquarePen, Loader2 } from 'lucide-react';
import { apiFetch } from '../api';

const WELCOME = { role: 'assistant', content: "Hi, I'm **MediBot**. Ask me a medical question or how to use MediFlow AI." };

function renderMarkdown(text) {
  const html = (text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
  return { __html: html };
}

export default function MediBot() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const patientMatch = location.pathname.match(/\/patients\/([^/]+)/);
  const patientId = patientMatch ? patientMatch[1] : null;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const history = messages.filter((m) => m !== WELCOME);
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const data = await apiFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text, history, patient_id: patientId }),
      });
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages([...next, { role: 'assistant', content: `⚠️ ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center"
        title="MediBot"
      >
        {open ? <X size={24} /> : <Bot size={26} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[92vw] h-[500px] max-h-[75vh] bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-blue-600 text-white rounded-t-2xl">
            <div className="flex items-center gap-2 font-semibold"><Bot size={18} /> MediBot
              {patientId && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Context: {patientId}</span>}
            </div>
            <button onClick={() => setMessages([WELCOME])} title="New chat" className="hover:opacity-80"><SquarePen size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border text-slate-800 rounded-bl-sm'}`}
                  dangerouslySetInnerHTML={renderMarkdown(m.content)}
                />
              </div>
            ))}
            {loading && <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="animate-spin" size={16} /> thinking…</div>}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask MediBot…"
              className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:border-blue-500"
            />
            <button onClick={send} disabled={loading} className="p-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              <Send size={18} />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 text-center pb-2 px-3">AI support — a clinician must confirm.</p>
        </div>
      )}
    </>
  );
}
