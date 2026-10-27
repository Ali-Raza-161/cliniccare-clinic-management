import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'cliniccare.sqlite');
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('owner','doctor','receptionist')), created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS doctors(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, specialty TEXT NOT NULL, phone TEXT DEFAULT '', email TEXT DEFAULT '', fee INTEGER NOT NULL DEFAULT 1000, days TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat', start_time TEXT NOT NULL DEFAULT '09:00', end_time TEXT NOT NULL DEFAULT '17:00', active INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS patients(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT DEFAULT '', gender TEXT DEFAULT '', date_of_birth TEXT DEFAULT '', address TEXT DEFAULT '', history_notes TEXT DEFAULT '', consent INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS appointments(id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL REFERENCES patients(id), doctor_id INTEGER NOT NULL REFERENCES doctors(id), date TEXT NOT NULL, time TEXT NOT NULL, reason TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','cancelled','no-show')), cancel_reason TEXT DEFAULT '', fee INTEGER NOT NULL DEFAULT 1000, payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('paid','unpaid','partial')), amount_paid INTEGER NOT NULL DEFAULT 0, created_by INTEGER, created_at TEXT DEFAULT (datetime('now')), UNIQUE(doctor_id, date, time, status));
  CREATE INDEX IF NOT EXISTS idx_appt_doctor_date ON appointments(doctor_id, date);
  CREATE TABLE IF NOT EXISTS prescriptions(id INTEGER PRIMARY KEY AUTOINCREMENT, appointment_id INTEGER NOT NULL REFERENCES appointments(id), patient_id INTEGER NOT NULL REFERENCES patients(id), doctor_id INTEGER NOT NULL REFERENCES doctors(id), diagnosis_note TEXT DEFAULT '', advice TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS prescription_items(id INTEGER PRIMARY KEY AUTOINCREMENT, prescription_id INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE, medicine TEXT NOT NULL, dosage TEXT NOT NULL, duration TEXT NOT NULL, instructions TEXT DEFAULT '');
  CREATE TABLE IF NOT EXISTS support_tickets(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, subject TEXT NOT NULL, message TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'normal', status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved')), reply TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1), clinic_name TEXT NOT NULL DEFAULT 'ClinicCare Demo Clinic', phone TEXT DEFAULT '', email TEXT DEFAULT '', hours TEXT NOT NULL DEFAULT 'Mon-Sat, 9:00 AM - 5:00 PM', default_fee INTEGER NOT NULL DEFAULT 1000, address TEXT DEFAULT '');
  CREATE TABLE IF NOT EXISTS activity_log(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, user_name TEXT, action TEXT NOT NULL, detail TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')));
  INSERT OR IGNORE INTO settings(id) VALUES(1);
  `);
  // Unique index that blocks double-booking only for scheduled appointments:
  // the UNIQUE above includes status, so a cancelled slot can be re-booked.
  seed();
}

export function logActivity(userId: number | null, userName: string, action: string, detail = '') {
  db.prepare('INSERT INTO activity_log(user_id,user_name,action,detail) VALUES(?,?,?,?)').run(userId, userName, action, detail);
}

function seed() {
  const count = (db.prepare('SELECT COUNT(*) c FROM users').get() as any).c;
  if (count > 0) return;
  const hash = bcrypt.hashSync('demo123', 10);
  const ins = db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)');
  ins.run('Demo Owner', 'owner@cliniccare.local', hash, 'owner');
  ins.run('Dr Ayesha Khan', 'doctor@cliniccare.local', hash, 'doctor');
  ins.run('Reception Demo', 'reception@cliniccare.local', hash, 'receptionist');
  const d = db.prepare('INSERT INTO doctors(name,specialty,phone,email,fee,days,start_time,end_time) VALUES(?,?,?,?,?,?,?,?)');
  d.run('Dr Ayesha Khan', 'General Medicine', '', '', 1000, 'Mon,Tue,Wed,Thu,Fri,Sat', '09:00', '17:00');
  d.run('Dr Bilal Ahmed', 'Cardiology', '', '', 1500, 'Mon,Wed,Fri', '10:00', '16:00');
  d.run('Dr Sara Malik', 'Dermatology', '', '', 1200, 'Tue,Thu,Sat', '09:00', '15:00');
  const p = db.prepare('INSERT INTO patients(name,phone,email,gender,date_of_birth,address,history_notes,consent) VALUES(?,?,?,?,?,?,?,?)');
  p.run('Ahmed Raza', '0300-1111111', '', 'Male', '1995-04-10', 'Lahore', 'Demo record only. No real patient data.', 1);
  p.run('Fatima Bibi', '0300-2222222', '', 'Female', '1990-08-22', 'Lahore', 'Demo record only. No real patient data.', 1);
  p.run('Usman Ali', '0300-3333333', '', 'Male', '1988-01-05', 'Lahore', 'Demo record only. No real patient data.', 1);
  // Appointments relative to today so dashboard/reminders always show data
  const today = new Date(); const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const a = db.prepare(`INSERT INTO appointments(patient_id,doctor_id,date,time,reason,status,fee,payment_status,amount_paid,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)`);
  a.run(1, 1, fmt(today), '10:00', 'General checkup', 'scheduled', 1000, 'unpaid', 0, 1);
  a.run(2, 2, fmt(today), '11:00', 'Follow-up visit', 'scheduled', 1500, 'paid', 1500, 1);
  a.run(3, 1, fmt(tomorrow), '09:30', 'General checkup', 'scheduled', 1000, 'unpaid', 0, 1);
  a.run(1, 3, fmt(tomorrow), '12:00', 'Skin consultation', 'scheduled', 1200, 'partial', 500, 1);
}
