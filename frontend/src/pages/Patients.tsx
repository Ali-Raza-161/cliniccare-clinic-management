import { useEffect, useState } from 'react';
import { get, post, del, errMsg } from '../services/api';
export default function Patients() {
  const [list, setList] = useState<any[]>([]); const [msg, setMsg] = useState('');
  const [f, setF] = useState({ name: '', phone: '', email: '', gender: '', date_of_birth: '', address: '', history_notes: '', consent: false });
  async function load() { setList(await get('/patients')); }
  useEffect(() => { load(); }, []);
  async function add(e: React.FormEvent) { e.preventDefault(); try { await post('/patients', f); setMsg('Patient added.'); setF({ name: '', phone: '', email: '', gender: '', date_of_birth: '', address: '', history_notes: '', consent: false }); load(); } catch (ex) { setMsg(errMsg(ex)); } }
  return (
    <div>
      <h1 className="text-2xl font-bold">Patients</h1>
      <p className="text-slate-500">Demo records only — no real patients. Written consent is recorded before any history note is kept, and a patient can be deleted with all their data on request (owner only).</p>
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <form onSubmit={add} className="bg-white rounded-2xl shadow-sm border p-5 space-y-3">
          <h2 className="font-bold">Add patient</h2>
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Full name *" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Phone *" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
          <div className="grid grid-cols-2 gap-2"><input className="border rounded-lg px-3 py-2" placeholder="Gender" value={f.gender} onChange={e => setF({ ...f, gender: e.target.value })} /><input type="date" className="border rounded-lg px-3 py-2" value={f.date_of_birth} onChange={e => setF({ ...f, date_of_birth: e.target.value })} /></div>
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Address" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} />
          <textarea className="w-full border rounded-lg px-3 py-2" placeholder="History notes (doctor-entered only)" value={f.history_notes} onChange={e => setF({ ...f, history_notes: e.target.value })} />
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={f.consent} onChange={e => setF({ ...f, consent: e.target.checked })} /> Written consent given (and parent consent for minors)</label>
          {msg && <p className="text-sm">{msg}</p>}
          <button className="w-full bg-teal-700 text-white rounded-lg py-2 font-semibold">Add patient</button>
        </form>
        <div className="lg:col-span-2 space-y-3">{list.map((p: any) => <div key={p.id} className="bg-white rounded-2xl shadow-sm border p-5"><div className="flex justify-between"><div><p className="font-bold">{p.name}</p><p className="text-sm text-slate-500">{p.phone} · {p.email || 'No email'} · {p.gender} · {p.date_of_birth}</p><p className="text-sm mt-1">{p.history_notes}</p><p className="text-xs text-slate-500 mt-1">Consent: {p.consent ? 'Yes' : 'No'} · {p.address}</p></div><button className="text-xs text-red-600 border rounded px-2 py-1 h-fit" onClick={async () => { if (confirm('Delete this patient and all their appointments and prescriptions? (Owner only)')) { try { await del(`/patients/${p.id}`); load(); } catch (ex) { setMsg(errMsg(ex)); } } }}>Delete</button></div></div>)}</div>
      </div>
    </div>
  );
}
