import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Patients from './pages/Patients';
import Doctors from './pages/Doctors';
import Prescriptions from './pages/Prescriptions';
import Reports from './pages/Reports';
import Support from './pages/Support';
import Settings from './pages/Settings';
import AIAgent from './components/AIAgent';
import { get } from './services/api';

function authed() { return !!localStorage.getItem('cc_token'); }
function Guard({ children }: { children: React.ReactElement }) { return authed() ? children : <Navigate to="/login" />; }
const NAV = [
  ['CLINIC', [['/dashboard', 'Dashboard'], ['/appointments', 'Appointments'], ['/doctors', 'Doctors'], ['/prescriptions', 'Prescriptions']]],
  ['PATIENTS & BILLING', [['/patients', 'Patients'], ['/reports', 'Reports & Billing']]],
  ['HELP & SETTINGS', [['/support', 'Support & Help'], ['/settings', 'Settings & Users']]],
];
export default function App() {
  const loc = useLocation();
  const [user, setUser] = useState<any>(null); const [clinic, setClinic] = useState('ClinicCare Demo Clinic');
  useEffect(() => { const u = localStorage.getItem('cc_user'); if (u) setUser(JSON.parse(u)); get('/settings').then((s: any) => setClinic(s.clinic_name)).catch(() => {}); }, [loc.pathname]);
  if (loc.pathname === '/login') return <Routes><Route path="/login" element={<Login />} /><Route path="*" element={<Navigate to="/login" />} /></Routes>;
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 bg-slate-900 text-white p-5 flex flex-col gap-1 sticky top-0 h-screen">
        <p className="text-2xl font-extrabold">Clinic<span className="text-amber-500">Care</span></p>
        <p className="text-xs text-slate-400 mb-4">{clinic} · Clinic &amp; AI Booking</p>
        {NAV.map(([group, items]) => <div key={group as string}><p className="text-[11px] tracking-wider text-slate-400 mt-4 mb-1">{group}</p>{(items as any[]).map(([to, label]: any) => <Link key={to} to={to} className={`block rounded-lg px-3 py-2 text-sm ${loc.pathname === to ? 'bg-teal-700' : 'hover:bg-slate-800'}`}>{label}</Link>)}</div>)}
        <div className="mt-auto"><p className="text-xs text-slate-400">Signed in as</p><p className="text-sm font-semibold">{user?.name} ({user?.role})</p>
        <button className="mt-2 w-full bg-white text-slate-900 rounded-lg py-2 text-sm font-semibold" onClick={() => { localStorage.removeItem('cc_token'); localStorage.removeItem('cc_user'); location.href = '/login'; }}>Log out</button></div>
      </aside>
      <main className="flex-1 p-6 max-w-6xl">
        <Routes>
          <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
          <Route path="/appointments" element={<Guard><Appointments /></Guard>} />
          <Route path="/patients" element={<Guard><Patients /></Guard>} />
          <Route path="/doctors" element={<Guard><Doctors /></Guard>} />
          <Route path="/prescriptions" element={<Guard><Prescriptions /></Guard>} />
          <Route path="/reports" element={<Guard><Reports /></Guard>} />
          <Route path="/support" element={<Guard><Support /></Guard>} />
          <Route path="/settings" element={<Guard><Settings /></Guard>} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>
      {authed() && <AIAgent />}
    </div>
  );
}
