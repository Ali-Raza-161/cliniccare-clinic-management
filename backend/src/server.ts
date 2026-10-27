import express from 'express';
import cors from 'cors';
import { db, initDb, logActivity } from './db';
import { signToken, verifyPassword, requireAuth, requireRole, findUserByEmail, hashPassword, type AuthUser } from './auth';
import { agentReply, AGENT_DISCLAIMER } from './agent';

initDb();
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
type Req = express.Request & { user?: AuthUser };
const row = (s: string, p: any[] = []) => db.prepare(s).get(...p) as any;
const all = (s: string, p: any[] = []) => db.prepare(s).all(...p) as any[];

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'cliniccare', agent: 'pattern-based demo, no diagnosis' }));

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const u = findUserByEmail(String(email || '').toLowerCase());
  if (!u || !verifyPassword(String(password || ''), u.password_hash)) return res.status(401).json({ error: 'Invalid email or password.' });
  const user = { id: u.id, name: u.name, email: u.email, role: u.role };
  logActivity(u.id, u.name, 'login', 'Signed in');
  res.json({ token: signToken(user), user });
});
app.get('/api/auth/me', requireAuth, (req: Req, res) => res.json({ user: req.user }));

app.get('/api/settings', requireAuth, (_req, res) => res.json(row('SELECT * FROM settings WHERE id=1')));
app.put('/api/settings', requireAuth, requireRole('owner'), (req: Req, res) => {
  const s = req.body || {};
  db.prepare('UPDATE settings SET clinic_name=?, phone=?, email=?, hours=?, default_fee=?, address=? WHERE id=1').run(s.clinic_name || 'ClinicCare Demo Clinic', s.phone || '', s.email || '', s.hours || '', Number(s.default_fee) || 1000, s.address || '');
  logActivity(req.user!.id, req.user!.name, 'settings_updated', '');
  res.json(row('SELECT * FROM settings WHERE id=1'));
});

// Doctors
app.get('/api/doctors', requireAuth, (_req, res) => res.json(all('SELECT * FROM doctors ORDER BY name')));
app.post('/api/doctors', requireAuth, requireRole('owner'), (req: Req, res) => {
  const d = req.body || {};
  if (!d.name || !d.specialty) return res.status(400).json({ error: 'Name and specialty are required.' });
  const r = db.prepare('INSERT INTO doctors(name,specialty,phone,email,fee,days,start_time,end_time) VALUES(?,?,?,?,?,?,?,?)').run(d.name, d.specialty, d.phone || '', d.email || '', Number(d.fee) || 1000, d.days || 'Mon,Tue,Wed,Thu,Fri,Sat', d.start_time || '09:00', d.end_time || '17:00');
  logActivity(req.user!.id, req.user!.name, 'doctor_created', d.name);
  res.status(201).json(row('SELECT * FROM doctors WHERE id=?', [r.lastInsertRowid]));
});

// Patients
app.get('/api/patients', requireAuth, (_req, res) => res.json(all('SELECT * FROM patients ORDER BY name')));
app.post('/api/patients', requireAuth, requireRole('owner', 'receptionist'), (req: Req, res) => {
  const p = req.body || {};
  if (!p.name || !p.phone) return res.status(400).json({ error: 'Name and phone are required.' });
  const r = db.prepare('INSERT INTO patients(name,phone,email,gender,date_of_birth,address,history_notes,consent) VALUES(?,?,?,?,?,?,?,?)').run(p.name, p.phone, p.email || '', p.gender || '', p.date_of_birth || '', p.address || '', p.history_notes || '', p.consent ? 1 : 0);
  logActivity(req.user!.id, req.user!.name, 'patient_created', p.name);
  res.status(201).json(row('SELECT * FROM patients WHERE id=?', [r.lastInsertRowid]));
});
app.delete('/api/patients/:id', requireAuth, requireRole('owner'), (req: Req, res) => {
  // Privacy: deleting a patient also removes their appointments/prescriptions in this demo (documented).
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM prescription_items WHERE prescription_id IN (SELECT id FROM prescriptions WHERE patient_id=?)').run(req.params.id);
    db.prepare('DELETE FROM prescriptions WHERE patient_id=?').run(req.params.id);
    db.prepare('DELETE FROM appointments WHERE patient_id=?').run(req.params.id);
    db.prepare('DELETE FROM patients WHERE id=?').run(req.params.id);
  });
  tx(); logActivity(req.user!.id, req.user!.name, 'patient_deleted', `patient:${req.params.id}`);
  res.json({ ok: true });
});

// Appointments — booking inside a transaction, double-booking blocked by unique index + explicit check
const TIMES = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];
app.get('/api/appointments', requireAuth, (req, res) => {
  const { date, doctor_id, status } = req.query as any;
  let q = `SELECT a.*, p.name AS patient_name, d.name AS doctor_name, d.specialty FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN doctors d ON d.id=a.doctor_id WHERE 1=1`;
  const params: any[] = [];
  if (date) { q += ' AND a.date=?'; params.push(date); }
  if (doctor_id) { q += ' AND a.doctor_id=?'; params.push(doctor_id); }
  if (status) { q += ' AND a.status=?'; params.push(status); }
  q += ' ORDER BY a.date, a.time';
  res.json(all(q, params));
});
app.get('/api/slots', requireAuth, (req, res) => {
  const { doctor_id, date } = req.query as any;
  if (!doctor_id || !date) return res.status(400).json({ error: 'doctor_id and date are required.' });
  const taken = new Set(all('SELECT time FROM appointments WHERE doctor_id=? AND date=? AND status=?', [doctor_id, date, 'scheduled']).map((r: any) => r.time));
  res.json(TIMES.map(t => ({ time: t, available: !taken.has(t) })));
});
app.post('/api/appointments', requireAuth, requireRole('owner', 'receptionist', 'doctor'), (req: Req, res) => {
  const b = req.body || {};
  if (!b.patient_id || !b.doctor_id || !b.date || !b.time) return res.status(400).json({ error: 'Patient, doctor, date and time are required.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date) || !TIMES.includes(b.time)) return res.status(400).json({ error: 'Date must be YYYY-MM-DD and time must be a 30-minute slot from 09:00 to 17:00.' });
  const doctor = row('SELECT * FROM doctors WHERE id=?', [b.doctor_id]);
  if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });
  const patient = row('SELECT * FROM patients WHERE id=?', [b.patient_id]);
  if (!patient) return res.status(404).json({ error: 'Patient not found.' });
  try {
    const tx = db.transaction(() => {
      const clash = row('SELECT id FROM appointments WHERE doctor_id=? AND date=? AND time=? AND status=?', [b.doctor_id, b.date, b.time, 'scheduled']);
      if (clash) throw new Error('DOUBLE_BOOKING');
      const r = db.prepare('INSERT INTO appointments(patient_id,doctor_id,date,time,reason,status,fee,payment_status,amount_paid,created_by) VALUES(?,?,?,?,?,?,?, ?,?,?)').run(b.patient_id, b.doctor_id, b.date, b.time, b.reason || '', 'scheduled', Number(b.fee) || doctor.fee, 'unpaid', 0, req.user!.id);
      return r.lastInsertRowid;
    });
    const id = tx();
    logActivity(req.user!.id, req.user!.name, 'appointment_booked', `appointment:${id}`);
    res.status(201).json(row('SELECT * FROM appointments WHERE id=?', [id]));
  } catch (e: any) {
    if (e.message === 'DOUBLE_BOOKING') return res.status(409).json({ error: 'This doctor already has a scheduled appointment at that date and time.' });
    return res.status(400).json({ error: e.message });
  }
});
app.patch('/api/appointments/:id', requireAuth, requireRole('owner', 'receptionist', 'doctor'), (req: Req, res) => {
  const b = req.body || {}; const appt = row('SELECT * FROM appointments WHERE id=?', [req.params.id]);
  if (!appt) return res.status(404).json({ error: 'Appointment not found.' });
  if (b.status) {
    if (!['scheduled', 'completed', 'cancelled', 'no-show'].includes(b.status)) return res.status(400).json({ error: 'Invalid status.' });
    if (b.status === 'cancelled' && !b.cancel_reason) return res.status(400).json({ error: 'A reason is required to cancel.' });
    db.prepare('UPDATE appointments SET status=?, cancel_reason=? WHERE id=?').run(b.status, b.cancel_reason || appt.cancel_reason, req.params.id);
    logActivity(req.user!.id, req.user!.name, 'appointment_status', `appointment:${req.params.id} -> ${b.status}`);
  }
  if (b.payment_status) {
    if (!['paid', 'unpaid', 'partial'].includes(b.payment_status)) return res.status(400).json({ error: 'Invalid payment status.' });
    db.prepare('UPDATE appointments SET payment_status=?, amount_paid=? WHERE id=?').run(b.payment_status, Number(b.amount_paid ?? appt.amount_paid), req.params.id);
    logActivity(req.user!.id, req.user!.name, 'payment_updated', `appointment:${req.params.id} ${b.payment_status}`);
  }
  if (b.date || b.time) {
    const date = b.date || appt.date, time = b.time || appt.time;
    const clash = row('SELECT id FROM appointments WHERE doctor_id=? AND date=? AND time=? AND status=? AND id<>?', [appt.doctor_id, date, time, 'scheduled', req.params.id]);
    if (clash) return res.status(409).json({ error: 'This doctor already has a scheduled appointment at that date and time.' });
    db.prepare('UPDATE appointments SET date=?, time=? WHERE id=?').run(date, time, req.params.id);
    logActivity(req.user!.id, req.user!.name, 'appointment_rescheduled', `appointment:${req.params.id}`);
  }
  res.json(row('SELECT * FROM appointments WHERE id=?', [req.params.id]));
});

// Prescriptions
app.get('/api/prescriptions', requireAuth, (req, res) => {
  const { patient_id } = req.query as any;
  let q = `SELECT pr.*, p.name AS patient_name, d.name AS doctor_name FROM prescriptions pr JOIN patients p ON p.id=pr.patient_id JOIN doctors d ON d.id=pr.doctor_id`;
  const params: any[] = [];
  if (patient_id) { q += ' WHERE pr.patient_id=?'; params.push(patient_id); }
  q += ' ORDER BY pr.created_at DESC';
  const list = all(q, params);
  for (const pr of list) pr.items = all('SELECT * FROM prescription_items WHERE prescription_id=?', [pr.id]);
  res.json(list);
});
app.post('/api/prescriptions', requireAuth, requireRole('owner', 'doctor'), (req: Req, res) => {
  const b = req.body || {};
  if (!b.appointment_id || !Array.isArray(b.items) || b.items.length === 0) return res.status(400).json({ error: 'Appointment and at least one medicine are required.' });
  const appt = row('SELECT * FROM appointments WHERE id=?', [b.appointment_id]);
  if (!appt) return res.status(404).json({ error: 'Appointment not found.' });
  const tx = db.transaction(() => {
    const r = db.prepare('INSERT INTO prescriptions(appointment_id,patient_id,doctor_id,diagnosis_note,advice) VALUES(?,?,?,?,?)').run(appt.id, appt.patient_id, appt.doctor_id, b.diagnosis_note || '', b.advice || '');
    const ii = db.prepare('INSERT INTO prescription_items(prescription_id,medicine,dosage,duration,instructions) VALUES(?,?,?,?,?)');
    for (const it of b.items) { if (!it.medicine || !it.dosage || !it.duration) throw new Error('Each medicine needs medicine, dosage and duration.'); ii.run(r.lastInsertRowid, it.medicine, it.dosage, it.duration, it.instructions || ''); }
    return r.lastInsertRowid;
  });
  try { const id = tx(); logActivity(req.user!.id, req.user!.name, 'prescription_created', `prescription:${id}`); const pr = row('SELECT * FROM prescriptions WHERE id=?', [id]); pr.items = all('SELECT * FROM prescription_items WHERE prescription_id=?', [id]); res.status(201).json(pr); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Reports + dashboard
app.get('/api/dashboard', requireAuth, (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const today = all('SELECT * FROM appointments WHERE date=?', [date]);
  const revenue = row('SELECT COALESCE(SUM(amount_paid),0) paid, COALESCE(SUM(fee),0) billed FROM appointments WHERE date=?', [date]);
  res.json({ date, appointments_today: today.length, scheduled: today.filter((a: any) => a.status === 'scheduled').length, completed: today.filter((a: any) => a.status === 'completed').length, no_show: today.filter((a: any) => a.status === 'no-show').length, revenue_paid: revenue.paid, revenue_billed: revenue.billed, patients: (row('SELECT COUNT(*) c FROM patients') as any).c, doctors: (row('SELECT COUNT(*) c FROM doctors') as any).c, pending_credit: row('SELECT COALESCE(SUM(fee-amount_paid),0) due FROM appointments WHERE payment_status IN (?,?)', ['unpaid', 'partial']).due, low: [] });
});
app.get('/api/reports/summary', requireAuth, (req, res) => {
  const { from, to } = req.query as any;
  const f = from || new Date().toISOString().slice(0, 10), t = to || f;
  const rows = all('SELECT a.*, d.name AS doctor_name FROM appointments a JOIN doctors d ON d.id=a.doctor_id WHERE date BETWEEN ? AND ?', [f, t]);
  const byDoctor: Record<string, number> = {}; let revenue = 0, billed = 0;
  for (const r of rows) { byDoctor[r.doctor_name] = (byDoctor[r.doctor_name] || 0) + 1; revenue += r.amount_paid; billed += r.fee; }
  res.json({ from: f, to: t, total: rows.length, completed: rows.filter((r: any) => r.status === 'completed').length, cancelled: rows.filter((r: any) => r.status === 'cancelled').length, no_show: rows.filter((r: any) => r.status === 'no-show').length, revenue_paid: revenue, billed, by_doctor: byDoctor, no_show_list: rows.filter((r: any) => r.status === 'no-show') });
});
app.get('/api/reports/export', requireAuth, (req, res) => {
  const { from, to } = req.query as any; const f = from || new Date().toISOString().slice(0, 10), t = to || f;
  const rows = all('SELECT a.date,a.time,a.status,a.fee,a.payment_status,a.amount_paid,p.name patient,d.name doctor FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN doctors d ON d.id=a.doctor_id WHERE date BETWEEN ? AND ? ORDER BY date,time', [f, t]);
  const csv = 'date,time,patient,doctor,status,fee,payment_status,amount_paid\n' + rows.map((r: any) => [r.date, r.time, `"${r.patient}"`, `"${r.doctor}"`, r.status, r.fee, r.payment_status, r.amount_paid].join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', 'attachment; filename="cliniccare-report.csv"'); res.send(csv);
});
app.get('/api/reminders', requireAuth, (_req, res) => {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const d = tomorrow.toISOString().slice(0, 10);
  res.json({ date: d, note: 'In-app reminder list only. No SMS or WhatsApp message is sent automatically.', appointments: all('SELECT a.*, p.name patient_name, p.phone, d.name doctor_name FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN doctors d ON d.id=a.doctor_id WHERE date=? AND status=? ORDER BY time', [d, 'scheduled']) });
});
app.get('/api/activity', requireAuth, requireRole('owner'), (_req, res) => res.json(all('SELECT * FROM activity_log ORDER BY id DESC LIMIT 50')));

// Support tickets (KhataPOS pattern)
app.get('/api/support', requireAuth, (_req, res) => res.json(all('SELECT * FROM support_tickets ORDER BY id DESC')));
app.post('/api/support', requireAuth, (req: Req, res) => {
  const b = req.body || {};
  if (!b.subject || !b.message) return res.status(400).json({ error: 'Subject and message are required.' });
  const r = db.prepare('INSERT INTO support_tickets(name,subject,message,priority) VALUES(?,?,?,?)').run(req.user!.name, b.subject, b.message, b.priority || 'normal');
  logActivity(req.user!.id, req.user!.name, 'support_ticket_created', b.subject);
  res.status(201).json(row('SELECT * FROM support_tickets WHERE id=?', [r.lastInsertRowid]));
});
app.patch('/api/support/:id', requireAuth, requireRole('owner'), (req: Req, res) => {
  const b = req.body || {};
  if (b.status && !['open', 'in_progress', 'resolved'].includes(b.status)) return res.status(400).json({ error: 'Invalid status.' });
  db.prepare('UPDATE support_tickets SET status=COALESCE(?,status), reply=COALESCE(?,reply) WHERE id=?').run(b.status || null, b.reply ?? null, req.params.id);
  logActivity(req.user!.id, req.user!.name, 'support_ticket_updated', `ticket:${req.params.id}`);
  res.json(row('SELECT * FROM support_tickets WHERE id=?', [req.params.id]));
});

// AI agent — pattern-based demo only
app.post('/api/agent/chat', requireAuth, (req, res) => {
  const { message, context } = req.body || {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'A message is required.' });
  const doctors = all('SELECT * FROM doctors WHERE active=1 ORDER BY name');
  const settings = row('SELECT * FROM settings WHERE id=1');
  res.json({ ...agentReply(message, context || {}, doctors, settings), disclaimer: AGENT_DISCLAIMER });
});
app.get('/api/agent/info', (_req, res) => res.json({ type: 'pattern-based demo agent', llm: false, api_key: false, diagnosis: false, disclaimer: AGENT_DISCLAIMER }));

// Users (owner only, for Settings page)
app.get('/api/users', requireAuth, requireRole('owner'), (_req, res) => res.json(all('SELECT id,name,email,role,created_at FROM users ORDER BY name')));
app.post('/api/users', requireAuth, requireRole('owner'), (req: Req, res) => {
  const b = req.body || {};
  if (!b.name || !b.email || !b.password || !['owner', 'doctor', 'receptionist'].includes(b.role)) return res.status(400).json({ error: 'Name, email, password and a valid role are required.' });
  try { const r = db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)').run(b.name, String(b.email).toLowerCase(), hashPassword(b.password), b.role); res.status(201).json(row('SELECT id,name,email,role FROM users WHERE id=?', [r.lastInsertRowid])); }
  catch { res.status(400).json({ error: 'That email is already used.' }); }
});

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
const PORT = Number(process.env.PORT) || 4000;
if (require.main === module) app.listen(PORT, () => console.log(`ClinicCare API on http://localhost:${PORT}`));
export default app;
