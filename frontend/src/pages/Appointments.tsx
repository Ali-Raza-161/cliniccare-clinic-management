import { useEffect, useState } from 'react';
import { get, post, patch, errMsg } from '../services/api';
const TIMES = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];
export default function Appointments() {
  const [list, setList] = useState<any[]>([]); const [patients, setPatients] = useState<any[]>([]); const [doctors, setDoctors] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({ patient_id: '', doctor_id: '', time: '10:00', reason: '' });
  const [msg, setMsg] = useState(''); const [slots, setSlots] = useState<any[]>([]);
  async function load() { setList(await get(`/appointments?date=${date}`)); }
  useEffect(() => { get('/patients').then(setPatients).catch(() => {}); get('/doctors').then(setDoctors).catch(() => {}); }, []);
  useEffect(() => { load(); }, [date]);
  useEffect(() => { if (form.doctor_id) get(`/slots?doctor_id=${form.doctor_id}&date=${date}`).then(setSlots).catch(() => {}); }, [form.doctor_id, date]);
  async function book(e: React.FormEvent) { e.preventDefault(); setMsg(''); try { await post('/appointments', { ...form, patient_id: Number(form.patient_id), doctor_id: Number(form.doctor_id), date }); setMsg('Appointment booked.'); load(); } catch (ex) { setMsg(errMsg(ex)); } }
  async function update(id: number, body: any) { try { await patch(`/appointments/${id}`, body); load(); } catch (ex) { setMsg(errMsg(ex)); } }
  return (
    <div>
      <h1 className="text-2xl font-bold">Appointments</h1>
      <p className="text-slate-500">One booking per doctor, date and time — double booking is blocked. Cancel needs a reason.</p>
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <form onSubmit={book} className="bg-white rounded-2xl shadow-sm border p-5 space-y-3">
          <h2 className="font-bold">Book appointment</h2>
          <label className="block text-sm">Date<input type="date" className="w-full border rounded-lg px-3 py-2 mt-1" value={date} onChange={e => setDate(e.target.value)} /></label>
          <label className="block text-sm">Patient<select className="w-full border rounded-lg px-3 py-2 mt-1" value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })}><option value="">Select patient</option>{patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="block text-sm">Doctor<select className="w-full border rounded-lg px-3 py-2 mt-1" value={form.doctor_id} onChange={e => setForm({ ...form, doctor_id: e.target.value })}><option value="">Select doctor</option>{doctors.map((d: any) => <option key={d.id} value={d.id}>{d.name} — {d.specialty} (PKR {d.fee})</option>)}</select></label>
          {slots.length > 0 && <div className="flex flex-wrap gap-1">{slots.map((s: any) => <button type="button" key={s.time} disabled={!s.available} onClick={() => setForm({ ...form, time: s.time })} className={`text-xs px-2 py-1 rounded-full border ${form.time === s.time ? 'bg-teal-700 text-white' : s.available ? 'bg-white' : 'bg-slate-100 text-slate-400 line-through'}`}>{s.time}</button>)}</div>}
          <label className="block text-sm">Time<select className="w-full border rounded-lg px-3 py-2 mt-1" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}>{TIMES.map(t => <option key={t}>{t}</option>)}</select></label>
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Reason for visit (not a diagnosis)" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
          {msg && <p className="text-sm text-slate-700">{msg}</p>}
          <button className="w-full bg-teal-700 text-white rounded-lg py-2 font-semibold">Book appointment</button>
        </form>
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border p-5 overflow-x-auto">
          <h2 className="font-bold">Day view — {date}</h2>
          <table className="w-full text-sm mt-3"><thead><tr className="text-left text-slate-500"><th className="py-2">Time</th><th>Patient</th><th>Doctor</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead>
          <tbody>{list.map((a: any) => <tr key={a.id} className="border-t"><td className="py-2">{a.time}</td><td>{a.patient_name}</td><td>{a.doctor_name}</td>
            <td><span className={`px-2 py-1 rounded-full text-xs ${a.status === 'scheduled' ? 'bg-teal-50 text-teal-800' : a.status === 'completed' ? 'bg-green-50 text-green-800' : a.status === 'cancelled' ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-700'}`}>{a.status}</span></td>
            <td>PKR {a.amount_paid} / {a.fee} ({a.payment_status})</td>
            <td className="space-x-1 py-1">
              <button className="text-xs border rounded px-2 py-1" onClick={() => update(a.id, { status: 'completed' })}>Complete</button>
              <button className="text-xs border rounded px-2 py-1" onClick={() => update(a.id, { status: 'no-show' })}>No-show</button>
              <button className="text-xs border rounded px-2 py-1" onClick={() => { const r = prompt('Cancellation reason (required):'); if (r) update(a.id, { status: 'cancelled', cancel_reason: r }); }}>Cancel</button>
              <button className="text-xs border rounded px-2 py-1" onClick={() => update(a.id, { payment_status: 'paid', amount_paid: a.fee })}>Mark paid</button>
            </td></tr>)}</tbody></table>
          {list.length === 0 && <p className="text-sm text-slate-500 mt-3">No appointments on this date.</p>}
        </div>
      </div>
    </div>
  );
}
