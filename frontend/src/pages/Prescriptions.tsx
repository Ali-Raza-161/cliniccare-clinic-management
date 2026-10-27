import { useEffect, useState } from 'react';
import { get, post, errMsg } from '../services/api';
export default function Prescriptions() {
  const [list, setList] = useState<any[]>([]); const [appts, setAppts] = useState<any[]>([]); const [msg, setMsg] = useState('');
  const [f, setF] = useState({ appointment_id: '', diagnosis_note: '', advice: '' });
  const [items, setItems] = useState([{ medicine: '', dosage: '', duration: '', instructions: '' }]);
  const [printOne, setPrintOne] = useState<any>(null);
  async function load() { setList(await get('/prescriptions')); setAppts(await get('/appointments')); }
  useEffect(() => { load(); }, []);
  async function create(e: React.FormEvent) { e.preventDefault(); try { await post('/prescriptions', { ...f, appointment_id: Number(f.appointment_id), items }); setMsg('Prescription created.'); load(); } catch (ex) { setMsg(errMsg(ex)); } }
  return (
    <div>
      <h1 className="text-2xl font-bold">Prescriptions</h1><p className="text-slate-500">Created by a doctor after an appointment. Use Print to save as PDF from the browser. This demo never prescribes automatically.</p>
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <form onSubmit={create} className="bg-white rounded-2xl shadow-sm border p-5 space-y-3">
          <h2 className="font-bold">New prescription</h2>
          <label className="block text-sm">Appointment<select className="w-full border rounded-lg px-3 py-2 mt-1" value={f.appointment_id} onChange={e => setF({ ...f, appointment_id: e.target.value })}><option value="">Select appointment</option>{appts.map((a: any) => <option key={a.id} value={a.id}>{a.date} {a.time} — {a.patient_name} / {a.doctor_name}</option>)}</select></label>
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Doctor note (not a diagnosis by the AI agent)" value={f.diagnosis_note} onChange={e => setF({ ...f, diagnosis_note: e.target.value })} />
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Advice" value={f.advice} onChange={e => setF({ ...f, advice: e.target.value })} />
          {items.map((it, i) => <div key={i} className="border rounded-lg p-3 space-y-2">
            <input className="w-full border rounded px-2 py-1" placeholder="Medicine *" value={it.medicine} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, medicine: e.target.value } : x))} />
            <div className="grid grid-cols-2 gap-2"><input className="border rounded px-2 py-1" placeholder="Dosage *" value={it.dosage} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, dosage: e.target.value } : x))} /><input className="border rounded px-2 py-1" placeholder="Duration *" value={it.duration} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, duration: e.target.value } : x))} /></div>
            <input className="w-full border rounded px-2 py-1" placeholder="Instructions" value={it.instructions} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, instructions: e.target.value } : x))} />
          </div>)}
          <button type="button" className="text-sm border rounded px-3 py-1" onClick={() => setItems([...items, { medicine: '', dosage: '', duration: '', instructions: '' }])}>+ Add medicine</button>
          {msg && <p className="text-sm">{msg}</p>}
          <button className="w-full bg-teal-700 text-white rounded-lg py-2 font-semibold">Create prescription</button>
        </form>
        <div className="lg:col-span-2 space-y-3">{list.map((pr: any) => <div key={pr.id} className="bg-white rounded-2xl shadow-sm border p-5"><div className="flex justify-between"><div><p className="font-bold">{pr.patient_name} — {pr.doctor_name}</p><p className="text-sm text-slate-500">{pr.created_at} · {pr.diagnosis_note}</p></div><button className="text-sm border rounded px-3 py-1 h-fit" onClick={() => setPrintOne(pr)}>Print / PDF</button></div>
          <ul className="mt-2 text-sm list-disc ml-5">{pr.items.map((it: any, i: number) => <li key={i}>{it.medicine} — {it.dosage}, {it.duration} ({it.instructions})</li>)}</ul><p className="text-sm mt-1">Advice: {pr.advice}</p></div>)}</div>
      </div>
      {printOne && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPrintOne(null)}>
        <div className="bg-white rounded-2xl p-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
          <h2 className="text-xl font-bold">Prescription</h2><p className="text-sm text-slate-500">ClinicCare Demo Clinic · {printOne.created_at}</p>
          <p className="mt-3"><b>Patient:</b> {printOne.patient_name}</p><p><b>Doctor:</b> {printOne.doctor_name}</p><p><b>Note:</b> {printOne.diagnosis_note}</p>
          <ul className="mt-2 list-disc ml-5 text-sm">{printOne.items.map((it: any, i: number) => <li key={i}>{it.medicine} — {it.dosage}, {it.duration} ({it.instructions})</li>)}</ul>
          <p className="text-sm mt-2"><b>Advice:</b> {printOne.advice}</p>
          <div className="flex gap-2 mt-4"><button className="bg-teal-700 text-white rounded-lg px-4 py-2" onClick={() => window.print()}>Print / Save as PDF</button><button className="border rounded-lg px-4 py-2" onClick={() => setPrintOne(null)}>Close</button></div>
        </div></div>}
    </div>
  );
}
