import { useEffect, useState } from 'react';
import { get, post, errMsg } from '../services/api';
export default function Doctors() {
  const [list, setList] = useState<any[]>([]); const [msg, setMsg] = useState('');
  const [f, setF] = useState({ name: '', specialty: '', phone: '', email: '', fee: 1000, days: 'Mon,Tue,Wed,Thu,Fri,Sat', start_time: '09:00', end_time: '17:00' });
  async function load() { setList(await get('/doctors')); }
  useEffect(() => { load(); }, []);
  async function add(e: React.FormEvent) { e.preventDefault(); try { await post('/doctors', f); setMsg('Doctor added.'); load(); } catch (ex) { setMsg(errMsg(ex)); } }
  return (
    <div>
      <h1 className="text-2xl font-bold">Doctors</h1><p className="text-slate-500">Profiles, specialties, fees and working hours. Only the owner can add a doctor.</p>
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <form onSubmit={add} className="bg-white rounded-2xl shadow-sm border p-5 space-y-3">
          <h2 className="font-bold">Add doctor</h2>
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Name *" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Specialty *" value={f.specialty} onChange={e => setF({ ...f, specialty: e.target.value })} />
          <input className="w-full border rounded-lg px-3 py-2" type="number" placeholder="Fee (PKR)" value={f.fee} onChange={e => setF({ ...f, fee: Number(e.target.value) })} />
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Working days, e.g. Mon,Wed,Fri" value={f.days} onChange={e => setF({ ...f, days: e.target.value })} />
          <div className="grid grid-cols-2 gap-2"><input type="time" className="border rounded-lg px-3 py-2" value={f.start_time} onChange={e => setF({ ...f, start_time: e.target.value })} /><input type="time" className="border rounded-lg px-3 py-2" value={f.end_time} onChange={e => setF({ ...f, end_time: e.target.value })} /></div>
          {msg && <p className="text-sm">{msg}</p>}
          <button className="w-full bg-teal-700 text-white rounded-lg py-2 font-semibold">Add doctor</button>
        </form>
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-3">{list.map((d: any) => <div key={d.id} className="bg-white rounded-2xl shadow-sm border p-5"><p className="font-bold text-lg">{d.name}</p><p className="text-teal-700 font-semibold">{d.specialty}</p><p className="text-sm text-slate-500 mt-2">Fee: PKR {d.fee} · {d.days} · {d.start_time}–{d.end_time}</p><p className="text-sm text-slate-500">{d.phone} {d.email}</p></div>)}</div>
      </div>
    </div>
  );
}
