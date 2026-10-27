import { useState, useRef, useEffect } from 'react';
import { post, errMsg } from '../services/api';

interface Msg { from: 'user' | 'agent'; text: string; }
export default function AIAgent({ onBooked }: { onBooked?: () => void }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'agent', text: 'Hello, I am the ClinicCare booking assistant (demo, pattern-based — not a real doctor and not an LLM). I do not diagnose, prescribe, or give medical advice. I can help you book an appointment or answer questions about hours, doctors, services and fees.' }]);
  const [ctx, setCtx] = useState<any>({});
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<string[]>(['Book an appointment', 'Clinic hours', 'Doctors and fees']);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open]);

  async function send(text: string) {
    const t = text.trim(); if (!t || busy) return;
    setMsgs(m => [...m, { from: 'user', text: t }]); setInput(''); setBusy(true);
    try {
      const r = await post('/agent/chat', { message: t, context: ctx });
      setMsgs(m => [...m, { from: 'agent', text: r.reply }]);
      setCtx(r.context || {}); setOptions(r.options || []);
    } catch (e) { setMsgs(m => [...m, { from: 'agent', text: 'Sorry — ' + errMsg(e) }]); }
    setBusy(false);
  }
  async function confirmBooking() {
    try {
      const patients = await (await import('../services/api')).get('/patients');
      let patient = patients.find((p: any) => p.name.toLowerCase() === String(ctx.patientName || '').toLowerCase());
      if (!patient) {
        patient = await post('/patients', { name: ctx.patientName, phone: 'Not provided', consent: false, history_notes: 'Created by AI booking assistant (demo).' });
      }
      await post('/appointments', { patient_id: patient.id, doctor_id: ctx.doctorId, date: ctx.date, time: ctx.time, reason: 'Booked via AI booking assistant (demo)' });
      setMsgs(m => [...m, { from: 'agent', text: `Done — your appointment with ${ctx.doctorName} on ${ctx.date} at ${ctx.time} has been created. Please arrive 10 minutes early. This is not medical advice.` }]);
      setCtx({}); setOptions(['Book an appointment', 'Clinic hours']); onBooked?.();
    } catch (e) { setMsgs(m => [...m, { from: 'agent', text: 'That slot could not be booked: ' + errMsg(e) + ' Please choose another time.' }]); }
  }
  if (!open) return (
    <button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-50 rounded-full bg-teal-700 hover:bg-teal-800 text-white px-5 py-3 shadow-xl font-semibold">
      AI Booking Assistant
    </button>
  );
  return (
    <div className="fixed bottom-5 right-5 z-50 w-[380px] max-w-[92vw] bg-white rounded-2xl shadow-2xl border overflow-hidden flex flex-col" style={{ height: 520 }}>
      <div className="bg-slate-900 text-white p-4">
        <div className="flex justify-between items-start"><div><p className="font-bold">AI Booking Assistant</p><p className="text-xs text-slate-300">Demo agent · pattern-based, not an LLM · No diagnosis, no medical advice</p></div>
        <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-white text-xl leading-none">×</button></div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
        {msgs.map((m, i) => <div key={i} className={m.from === 'user' ? 'text-right' : ''}><span className={`inline-block px-3 py-2 rounded-2xl text-sm max-w-[85%] ${m.from === 'user' ? 'bg-teal-700 text-white' : 'bg-white border text-slate-800'}`}>{m.text}</span></div>)}
        <div ref={bottom} />
      </div>
      {options.length > 0 && <div className="flex flex-wrap gap-2 px-3 pt-2">{options.map(o => <button key={o} onClick={() => send(o)} className="text-xs border border-teal-700 text-teal-800 rounded-full px-3 py-1 hover:bg-teal-50">{o}</button>)}</div>}
      {ctx.step === 'confirm' && <div className="px-3 pt-2"><button onClick={confirmBooking} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg py-2">Confirm booking</button></div>}
      <form className="flex gap-2 p-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about booking, hours, doctors…" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        <button className="bg-teal-700 text-white rounded-lg px-4 py-2 font-semibold" disabled={busy}>Send</button>
      </form>
      <p className="px-3 pb-3 text-[11px] text-slate-500">For any health concern, please see a doctor in person. This assistant does not diagnose or prescribe.</p>
    </div>
  );
}
