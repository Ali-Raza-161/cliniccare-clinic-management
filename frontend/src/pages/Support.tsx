import { useEffect, useState } from 'react';
import { get, post, patch, errMsg } from '../services/api';
export default function Support() {
  const [tickets, setTickets] = useState<any[]>([]); const [settings, setSettings] = useState<any>({}); const [msg, setMsg] = useState('');
  const [f, setF] = useState({ subject: '', message: '', priority: 'normal' });
  const user = JSON.parse(localStorage.getItem('cc_user') || '{}');
  async function load() { setTickets(await get('/support')); setSettings(await get('/settings')); }
  useEffect(() => { load(); }, []);
  async function create(e: React.FormEvent) { e.preventDefault(); try { await post('/support', f); setMsg('Support ticket created. We will follow up on it.'); setF({ subject: '', message: '', priority: 'normal' }); load(); } catch (ex) { setMsg(errMsg(ex)); } }
  return (
    <div>
      <h1 className="text-2xl font-bold">Support &amp; Help</h1><p className="text-slate-500">Guides, answers, and a ticket form — for every role.</p>
      {msg && <p className="mt-3 bg-green-50 border-l-4 border-green-600 px-4 py-3 rounded">{msg}</p>}
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <h2 className="font-bold text-lg">Contact support</h2>
          <p className="text-sm mt-2"><b>Email:</b> {settings.email || 'Not set yet — add it in Settings.'}</p>
          <p className="text-sm mt-1"><b>Phone / WhatsApp:</b> {settings.phone || 'Not set yet — add it in Settings.'}</p>
          <p className="text-sm text-slate-500 mt-1">No support contact is shown unless the clinic owner enters it in Settings.</p>
          <form onSubmit={create} className="mt-4 space-y-3">
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Subject *" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} />
            <textarea className="w-full border rounded-lg px-3 py-2" placeholder="Describe the problem *" value={f.message} onChange={e => setF({ ...f, message: e.target.value })} />
            <label className="block text-sm">Priority<select className="w-full border rounded-lg px-3 py-2 mt-1" value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label>
            <button className="bg-teal-700 text-white rounded-lg px-4 py-2 font-semibold">Create ticket</button>
          </form>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <h2 className="font-bold text-lg">Help Center — quick guides</h2>
          <h3 className="font-semibold mt-3">Booking an appointment</h3><p className="text-sm text-slate-600">Open Appointments, pick a date, patient and doctor, choose a free 30-minute slot, and book. A booked slot cannot be taken by another patient.</p>
          <h3 className="font-semibold mt-3">Using the AI assistant</h3><p className="text-sm text-slate-600">The chat widget helps with booking, hours, doctors and fees. It never diagnoses or gives medical advice — symptom questions get a safe reply to see a doctor.</p>
          <h3 className="font-semibold mt-3">Prescriptions and billing</h3><p className="text-sm text-slate-600">Doctors create prescriptions after an appointment and print them from the browser. Mark payment as paid, partial or unpaid on the Appointments page; Reports shows daily revenue.</p>
          <h2 className="font-bold text-lg mt-5">Frequently asked questions</h2>
          <p className="text-sm mt-2"><b>Can I book the same slot twice?</b> No — double booking is blocked by the system.</p>
          <p className="text-sm mt-1"><b>Does the AI agent diagnose patients?</b> No. It only helps with booking and clinic information.</p>
          <p className="text-sm mt-1"><b>Are reminders sent automatically?</b> No — reminders are an in-app list only.</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border p-5 mt-4">
        <h2 className="font-bold text-lg">Support tickets</h2>
        <div className="space-y-3 mt-3">{tickets.map((t: any) => <div key={t.id} className="border rounded-lg p-3"><div className="flex justify-between gap-2 flex-wrap"><b>{t.subject}</b><span className="text-xs px-2 py-1 rounded-full bg-slate-100">{t.status} · {t.priority}</span></div><p className="text-sm text-slate-600 mt-1">{t.message}</p>{t.reply && <p className="text-sm mt-1 bg-teal-50 rounded px-2 py-1"><b>Reply:</b> {t.reply}</p>}
          {user.role === 'owner' && <div className="flex gap-2 mt-2 flex-wrap"><button className="text-xs border rounded px-2 py-1" onClick={async () => { const r = prompt('Reply note (optional):') ?? ''; await patch(`/support/${t.id}`, { status: 'in_progress', reply: r || t.reply }); load(); }}>Mark in progress</button><button className="text-xs border rounded px-2 py-1" onClick={async () => { const r = prompt('Reply note:') ?? ''; await patch(`/support/${t.id}`, { status: 'resolved', reply: r || t.reply }); load(); }}>Mark resolved</button></div>}</div>)}
        {tickets.length === 0 && <p className="text-sm text-slate-500 mt-2">No tickets yet.</p>}
        </div>
      </div>
    </div>
  );
}
