import { useEffect, useState } from 'react';
import { get } from '../services/api';
export default function Reports() {
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10)); const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [r, setR] = useState<any>(null);
  async function load() { setR(await get(`/reports/summary?from=${from}&to=${to}`)); }
  useEffect(() => { load(); }, []);
  return (
    <div>
      <h1 className="text-2xl font-bold">Reports &amp; Billing</h1><p className="text-slate-500">Daily revenue, doctor-wise appointments and no-shows. No real payment gateway — payments are recorded manually at the clinic.</p>
      <div className="flex gap-2 mt-4 flex-wrap items-end">
        <label className="text-sm">From<input type="date" className="block border rounded-lg px-3 py-2" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label className="text-sm">To<input type="date" className="block border rounded-lg px-3 py-2" value={to} onChange={e => setTo(e.target.value)} /></label>
        <button onClick={load} className="bg-teal-700 text-white rounded-lg px-4 py-2 font-semibold">Load report</button>
        <a className="border rounded-lg px-4 py-2" href={`/api/reports/export?from=${from}&to=${to}`} onClick={(e) => { e.preventDefault(); const t = localStorage.getItem('cc_token'); fetch(`/api/reports/export?from=${from}&to=${to}`, { headers: { Authorization: 'Bearer ' + t } }).then(res => res.blob()).then(b => { const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'cliniccare-report.csv'; a.click(); }); }}>Export CSV</a>
      </div>
      {r && <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {[['Total appointments', r.total], ['Completed', r.completed], ['Cancelled', r.cancelled], ['No-show', r.no_show], ['Revenue collected (PKR)', r.revenue_paid], ['Billed (PKR)', r.billed]].map(([l, v]) => <div key={l as string} className="bg-white rounded-2xl shadow-sm border p-5"><p className="text-sm text-slate-500">{l}</p><p className="text-3xl font-extrabold mt-1">{String(v)}</p></div>)}
      </div>}
      {r && <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm border p-5"><h2 className="font-bold">Doctor-wise appointments</h2><ul className="mt-2 space-y-1 text-sm">{Object.entries(r.by_doctor || {}).map(([k, v]) => <li key={k} className="flex justify-between border-b py-1"><span>{k}</span><b>{String(v)}</b></li>)}</ul></div>
        <div className="bg-white rounded-2xl shadow-sm border p-5"><h2 className="font-bold">No-show list</h2>{r.no_show_list.length ? <ul className="mt-2 space-y-1 text-sm">{r.no_show_list.map((a: any) => <li key={a.id} className="border-b py-1">{a.date} {a.time} — {a.doctor_name}</li>)}</ul> : <p className="text-sm text-slate-500 mt-2">No no-shows in this range.</p>}</div>
      </div>}
    </div>
  );
}
