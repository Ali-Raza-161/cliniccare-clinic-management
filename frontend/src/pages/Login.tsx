import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post, errMsg } from '../services/api';
export default function Login() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState('');
  const nav = useNavigate();
  async function submit(e: React.FormEvent) { e.preventDefault(); try { const d = await post('/auth/login', { email, password }); localStorage.setItem('cc_token', d.token); localStorage.setItem('cc_user', JSON.stringify(d.user)); nav('/dashboard'); } catch (ex) { setErr(errMsg(ex)); } }
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <p className="text-3xl font-extrabold">Clinic<span className="text-amber-500">Care</span></p>
        <p className="text-slate-500 mt-1">Clinic management with an AI booking assistant.</p>
        <h1 className="text-xl font-bold mt-6">Sign in</h1>
        <p className="text-sm text-slate-500">Demo only — no real patient data. Demo logins: owner@cliniccare.local, doctor@cliniccare.local, reception@cliniccare.local — password: demo123</p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg py-2">Sign in</button>
        </form>
      </div>
    </div>
  );
}
