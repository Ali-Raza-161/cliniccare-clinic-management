import { useEffect, useState } from 'react';
import { get, put, post, errMsg } from '../services/api';
export default function Settings() {
  const [s, setS] = useState<any>({}); const [users, setUsers] = useState<any[]>([]); const [msg, setMsg] = useState('');
  const [nu, setNu] = useState({ name: '', email: '', password: '', role: 'receptionist' });
  const [act, setAct] = useState<any[]>([]);
  async function load() { setS(await get('/settings')); try { setUsers(await get('/users')); setAct(await get('/activity')); } catch {} }
  useEffect(() => { load(); }, []);
  async function save(e: React.FormEvent) { e.preventDefault(); try { await put('/settings', s); setMsg('Settings saved.'); } catch (ex) { setMsg(errMsg(ex)); } }
  async function addUser(e: React.FormEvent) { e.preventDefault(); try { await post('/users', nu); setMsg('User created.'); load(); } catch (ex) { setMsg(errMsg(ex)); } }
  return (
    <div>
      <h1 className="text-2xl font-bold">Settings &amp; Users</h1><p className="text-slate-500">Owner only. Contact details here feed the Support page — leave them empty and nothing is shown.</p>
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <form onSubmit={save} className="bg-white rounded-2xl shadow-sm border p-5 space-y-3">
          <h2 className="font-bold">Clinic settings</h2>
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Clinic name" value={s.clinic_name || ''} onChange={e => setS({ ...s, clinic_name: e.target.value })} />
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Phone (optional)" value={s.phone || ''} onChange={e => setS({ ...s, phone: e.target.value })} />
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Email (optional)" value={s.email || ''} onChange={e => setS({ ...s, email: e.target.value })} />
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Hours" value={s.hours || ''} onChange={e => setS({ ...s, hours: e.target.value })} />
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Address" value={s.address || ''} onChange={e => setS({ ...s, address: e.target.value })} />
          <input className="w-full border rounded-lg px-3 py-2" type="number" placeholder="Default consultation fee (PKR)" value={s.default_fee || 1000} onChange={e => setS({ ...s, default_fee: Number(e.target.value) })} />
          {msg && <p className="text-sm">{msg}</p>}
          <button className="w-full bg-teal-700 text-white rounded-lg py-2 font-semibold">Save settings</button>
        </form>
        <div className="space-y-4">
          <form onSubmit={addUser} className="bg-white rounded-2xl shadow-sm border p-5 space-y-3">
            <h2 className="font-bold">Add user</h2>
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Name" value={nu.name} onChange={e => setNu({ ...nu, name: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Email" value={nu.email} onChange={e => setNu({ ...nu, email: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2" type="password" placeholder="Password" value={nu.password} onChange={e => setNu({ ...nu, password: e.target.value })} />
            <select className="w-full border rounded-lg px-3 py-2" value={nu.role} onChange={e => setNu({ ...nu, role: e.target.value })}><option value="owner">Owner</option><option value="doctor">Doctor</option><option value="receptionist">Receptionist</option></select>
            <button className="w-full bg-teal-700 text-white rounded-lg py-2 font-semibold">Create user</button>
          </form>
          <div className="bg-white rounded-2xl shadow-sm border p-5"><h2 className="font-bold">Users</h2><ul className="text-sm mt-2 space-y-1">{users.map((u: any) => <li key={u.id} className="border-b py-1">{u.name} — {u.email} ({u.role})</li>)}</ul></div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border p-5 mt-4"><h2 className="font-bold">Activity log</h2><ul className="text-sm mt-2 space-y-1 max-h-64 overflow-y-auto">{act.map((a: any) => <li key={a.id} className="border-b py-1">{a.created_at} — {a.user_name}: {a.action} {a.detail}</li>)}</ul></div>
    </div>
  );
}
