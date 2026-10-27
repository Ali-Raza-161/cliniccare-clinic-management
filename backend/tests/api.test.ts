import { test, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

process.env.DATABASE_PATH = path.join(os.tmpdir(), `cliniccare-test-${Date.now()}.sqlite`);
process.env.PORT = '0';
let server: any; let base = '';
async function start() {
  const { default: app } = await import('../src/server');
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as any).port}`;
}
async function req(method: string, p: string, body?: any, token?: string) {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
let owner = '', reception = '', doctorTok = '';
before(async () => {
  await start();
  owner = (await req('POST', '/api/auth/login', { email: 'owner@cliniccare.local', password: 'demo123' })).body.token;
  reception = (await req('POST', '/api/auth/login', { email: 'reception@cliniccare.local', password: 'demo123' })).body.token;
  doctorTok = (await req('POST', '/api/auth/login', { email: 'doctor@cliniccare.local', password: 'demo123' })).body.token;
  assert.ok(owner && reception && doctorTok, 'demo logins work');
});
after(() => { server.close(); try { fs.unlinkSync(process.env.DATABASE_PATH!); } catch {} });

test('wrong password rejected', async () => {
  const r = await req('POST', '/api/auth/login', { email: 'owner@cliniccare.local', password: 'wrong' });
  assert.equal(r.status, 401);
});
test('unauthenticated request rejected', async () => {
  const r = await req('GET', '/api/patients');
  assert.equal(r.status, 401);
});
test('double booking is blocked with 409', async () => {
  const patients = (await req('GET', '/api/patients', undefined, owner)).body;
  const doctors = (await req('GET', '/api/doctors', undefined, owner)).body;
  const first = await req('POST', '/api/appointments', { patient_id: patients[0].id, doctor_id: doctors[0].id, date: '2026-11-02', time: '10:00', reason: 'Checkup' }, reception);
  assert.equal(first.status, 201, JSON.stringify(first.body));
  const clash = await req('POST', '/api/appointments', { patient_id: patients[1].id, doctor_id: doctors[0].id, date: '2026-11-02', time: '10:00', reason: 'Checkup' }, reception);
  assert.equal(clash.status, 409);
  // different doctor at same slot is allowed
  const ok = await req('POST', '/api/appointments', { patient_id: patients[1].id, doctor_id: doctors[1].id, date: '2026-11-02', time: '10:00', reason: 'Checkup' }, reception);
  assert.equal(ok.status, 201);
});
test('cancel requires a reason, reschedule works', async () => {
  const list = (await req('GET', '/api/appointments?date=2026-11-02', undefined, owner)).body;
  const appt = list[0];
  const noReason = await req('PATCH', `/api/appointments/${appt.id}`, { status: 'cancelled' }, reception);
  assert.equal(noReason.status, 400);
  const cancelled = await req('PATCH', `/api/appointments/${appt.id}`, { status: 'cancelled', cancel_reason: 'Patient requested' }, reception);
  assert.equal(cancelled.body.status, 'cancelled');
  // cancelled slot can be re-booked
  const rebook = await req('POST', '/api/appointments', { patient_id: appt.patient_id, doctor_id: appt.doctor_id, date: '2026-11-02', time: '10:00', reason: 'Rebooked' }, reception);
  assert.equal(rebook.status, 201);
});
test('prescription + billing totals', async () => {
  const list = (await req('GET', '/api/appointments?date=2026-11-02', undefined, owner)).body;
  const appt = list.find((a: any) => a.status === 'scheduled');
  const pr = await req('POST', '/api/prescriptions', { appointment_id: appt.id, diagnosis_note: 'Seen by doctor (demo note)', advice: 'Follow up in 2 weeks', items: [{ medicine: 'Paracetamol', dosage: '500mg', duration: '3 days', instructions: 'After meals' }] }, doctorTok);
  assert.equal(pr.status, 201, JSON.stringify(pr.body));
  assert.equal(pr.body.items.length, 1);
  const paid = await req('PATCH', `/api/appointments/${appt.id}`, { payment_status: 'paid', amount_paid: appt.fee }, reception);
  assert.equal(paid.body.payment_status, 'paid');
  const dash = await req('GET', '/api/dashboard?date=2026-11-02', undefined, owner);
  assert.equal(dash.body.revenue_paid, appt.fee);
});
test('role access: receptionist cannot see settings users, doctor cannot create patients', async () => {
  const r1 = await req('GET', '/api/users', undefined, reception);
  assert.equal(r1.status, 403);
  const r2 = await req('POST', '/api/patients', { name: 'X', phone: '0300' }, doctorTok);
  assert.equal(r2.status, 403);
});
test('support ticket flow: create then resolve', async () => {
  const t = await req('POST', '/api/support', { subject: 'Printer issue', message: 'Receipt printer is offline.', priority: 'high' }, reception);
  assert.equal(t.status, 201);
  const upd = await req('PATCH', `/api/support/${t.body.id}`, { status: 'resolved', reply: 'Printer restarted.' }, owner);
  assert.equal(upd.body.status, 'resolved');
});
test('AI agent: booking flow and no-diagnosis replies', async () => {
  const info = await req('GET', '/api/agent/info');
  assert.equal(info.body.llm, false); assert.equal(info.body.diagnosis, false);
  const s1 = await req('POST', '/api/agent/chat', { message: 'I want to book an appointment', context: {} }, reception);
  assert.equal(s1.body.step, 'choose_doctor');
  const s2 = await req('POST', '/api/agent/chat', { message: 'I have a fever and chest pain, what medicine should I take?', context: {} }, reception);
  assert.match(s2.body.reply, /do not diagnose|I cannot help with symptoms/i);
  assert.doesNotMatch(s2.body.reply, /paracetamol|take.*medicine/i);
  const s3 = await req('POST', '/api/agent/chat', { message: 'What are your clinic hours?', context: {} }, reception);
  assert.match(s3.body.reply, /9:00/);
});
test('CSV export returns rows', async () => {
  const r = await fetch(base + '/api/reports/export?from=2026-11-02&to=2026-11-02', { headers: { Authorization: 'Bearer ' + owner } });
  assert.equal(r.status, 200);
  const text = await r.text();
  assert.match(text, /date,time,patient/);
});
