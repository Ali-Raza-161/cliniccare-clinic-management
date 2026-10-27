import { useEffect, useState } from 'react';
import { get } from '../services/api';
import { Link } from 'react-router-dom';
export default function Dashboard() {
  const [d, setD] = useState<any>(null); const [rem, setRem] = useState<any>(null);
  useEffect(() => { get('/dashboard').then(setD).catch(() => {}); get('/reminders').then(setRem).catch(() => {}); }, []);
  if (!d) return <p>Loading…</p>;
  const cards = [
    ['Appointments today', d.appointments_today], ['Scheduled', d.scheduled], ['Completed', d.completed],
    ['Revenue collected today (PKR)', d.revenue_paid], ['Billed today (PKR)', d.revenue_billed], ['Patients', d.patients], ['Doctors', d.doctors], ['Pending balance (PKR)', d.pending_credit],
  ];
  return (
    <div>
      <div className="flex justify-between items-center flex-wrap gap-3"><div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-slate-500">Today at a glance — {d.date}</p></div><Link to="/appointments" className="bg-teal-700 text-white px-4 py-2 rounded-lg font-semibold">+ New appointment</Link></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
        {cards.map(([label, v]) => <div key={label as string} className="bg-white rounded-2xl shadow-sm border p-5"><p className="text-sm text-slate-500">{label}</p><p className="text-3xl font-extrabold mt-1 text-slate-900">{String(v)}</p></div>)}
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm border p-5"><h2 className="font-bold text-lg">Tomorrow's reminders</h2><p className="text-sm text-slate-500">In-app list only — no SMS or WhatsApp is sent automatically.</p>
          {rem?.appointments?.length ? <ul className="mt-3 space-y-2">{rem.appointments.map((a: any) => <li key={a.id} className="border rounded-lg px-3 py-2 text-sm">{a.time} — {a.patient_name} with {a.doctor_name} ({a.phone})</li>)}</ul> : <p className="mt-3 text-sm">No appointments tomorrow ({rem?.date}).</p>}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-5"><h2 className="font-bold text-lg">AI Booking Assistant</h2><p className="text-sm text-slate-500 mt-1">The chat widget (bottom right) helps patients book appointments and answers hours, doctors and fees questions. It never diagnoses or gives medical advice — every symptom question gets a safe reply to see a doctor.</p>
        <p className="text-sm mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Demo data only. No real patients, no real medical records.</p></div>
      </div>
    </div>
  );
}
