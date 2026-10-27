# ClinicCare SaaS — Clinic Management System with AI Booking Assistant

Prepared by Ali Raza | Version 1.0

> **Medical disclaimer — read first:** ClinicCare is an educational/demo clinic management system. It is **not a medical device** and **not for diagnosis or treatment**. The AI assistant is a pattern-based demo: it **never diagnoses, prescribes, or gives medical advice**. Every symptom or medical question gets a safe reply telling the user to see a doctor in person. Final medical decisions are always made by a doctor.

> **Demo data only:** All patients, doctors and appointments in the seed data are fictional demo records. No real patients and no real medical records are included.

> **English only:** The whole user interface — labels, buttons, receipts, reports and messages — is English only.

## 1. Project Overview

ClinicCare is a web-based clinic management system for small clinics. It combines appointment booking, patient records, doctor schedules, prescriptions, billing and reports in one place, with a demo AI booking assistant that helps patients book appointments and answers clinic questions. The clinic owner, doctors and reception staff use a web dashboard with different permissions.

## 2. Problem Statement

Small clinics still book appointments on paper or by phone, lose track of patient visits, and have no clear record of daily revenue or no-shows. Patients call repeatedly to ask about hours, fees and availability. ClinicCare gives the clinic one simple system: no double bookings, a clear day view, prescription history, billing status, and an assistant that answers the routine questions.

## 3. Objectives

- Book appointments fast, with no double booking for the same doctor, date and time.
- Keep doctor profiles, specialties, schedules and fees in one place.
- Keep patient profiles with consent recorded, and allow full deletion on request.
- Create prescriptions per appointment and print them from the browser.
- Record consultation fees and payment status, and show daily revenue.
- Provide reports: daily appointments, doctor-wise load, no-shows, CSV export.
- Offer a demo AI booking assistant that helps with booking and FAQs, and never gives medical advice.
- Provide a Support & Help page with guides, FAQs and tickets.

## 4. Scope

In scope: doctors, patients, appointments, prescriptions, billing, reports, reminders list, roles, activity log, settings, Support & Help, AI booking assistant (pattern-based demo).
Out of scope (future work): real payment gateway, automatic SMS/WhatsApp reminders, multi-branch support, patient mobile app, insurance billing, integration with lab systems.

## 5. Features

### 5.1 Roles
| Role | Description | Main permissions |
|---|---|---|
| Owner / Admin | Clinic owner | Everything: users, settings, reports, support tickets, deletion |
| Doctor | Treating doctor | Appointments, patients (view), prescriptions, reports |
| Receptionist | Front desk | Book/cancel/reschedule appointments, add patients, receive payments, support tickets |

Passwords are hashed (bcrypt). Every request needs a JWT. The activity log records who did what.

### 5.2 Doctors
Profiles with name, specialty, phone, email, consultation fee, working days and hours. Only the owner can add a doctor.

### 5.3 Patients
Profiles with name, phone, email, gender, date of birth, address and history notes. Written consent is recorded before history notes are kept (parent consent for minors). The owner can delete a patient together with their appointments and prescriptions on request. A manual, non-AI booking path always exists.

### 5.4 Appointments
- Book by doctor, date and 30-minute time slot (09:00–17:00).
- Conflict prevention: a unique database constraint plus an explicit check inside a transaction block the same doctor/date/time being booked twice while scheduled. A cancelled slot can be re-booked.
- Statuses: scheduled, completed, cancelled, no-show. Cancellation requires a reason. Rescheduling checks for conflicts too.
- Day view, date filter, free-slot picker, reminders list for tomorrow (in-app list only — no SMS or WhatsApp is sent automatically).

### 5.5 Prescriptions
Created by a doctor or owner per appointment: medicine, dosage, duration and instructions, plus a doctor note and advice. History per patient. Print / Save as PDF from the browser print dialog (no PDF library is used in this build — stated honestly). The AI agent never creates a prescription.

### 5.6 Billing
Consultation fee per appointment (from the doctor's fee), payment status paid / unpaid / partial, amount paid, daily revenue summary. No real payment gateway — payments are recorded manually at the clinic.

### 5.7 Reports
Daily appointments, revenue collected vs billed, doctor-wise appointment counts, no-show list, CSV export.

### 5.8 Support & Help
Guides (booking, AI assistant, prescriptions and billing), FAQs, and a contact support form that creates a ticket (Open / In Progress / Resolved). The owner can update status and add a reply. The contact card reads the clinic phone/email from Settings, which are empty by default — no contact details are invented.

### 5.9 AI Agent (demo)
A chat widget on every page after sign-in. It is a **pattern / rule-based demo agent, not an LLM, with no API key**. It:
- Helps book an appointment step by step: doctor → date → time → patient name → summary → confirm (which creates a real booking through the same appointments API, with the same double-booking check).
- Answers clinic hours, doctors and fees, services, and cancellation/reschedule information.
- Helps with pre-visit intake by preparing a summary for the doctor.

It **never** diagnoses, prescribes, recommends a medicine or dose, or gives medical advice. Any message containing symptom, diagnosis, medicine, treatment or similar words gets the safe reply: it cannot help with symptoms/diagnosis/treatment, it is a demo booking assistant, and the user should see a doctor in person. The disclaimer appears in the agent header, in the agent's greeting, in every safe reply, in the chat footer, and in this README. See `backend/src/agent.ts` for the exact rules.

## 6. Languages and Technologies Used

| Language | Where it is used |
|---|---|
| TypeScript | Backend API and React frontend |
| SQL (SQLite) | Database queries (better-sqlite3) |
| HTML5 / CSS3 | Page structure and styling via React JSX and Tailwind CSS |
| JSON | API requests and responses |
| Markdown | README and documentation |

| Area | Technology |
|---|---|
| Backend | Node.js + Express + TypeScript, better-sqlite3 (SQLite file locally; Postgres via `DATABASE_URL` is documented, not live-tested) |
| Frontend | React + Vite + TypeScript, Tailwind CSS v4, React Router, Axios |
| Authentication | JWT, bcryptjs |
| AI agent | Hand-written pattern matching in `backend/src/agent.ts` (no LLM, no API key) |
| Testing | Node built-in test runner (`tsx --test`) for the API; Playwright for browser screenshots |
| Tools | Git, GitHub, VS Code, Postman/curl |

## 7. System Architecture

MVC-style layering: React client → Express API → services (booking in transactions, agent rules) → SQLite database.

Booking flow: receptionist or AI assistant sends patient + doctor + date + time → the API validates the slot → inside one database transaction it checks for a scheduled booking at that slot and inserts the appointment, or returns 409 if the slot is taken → the appointment appears in the day view → payment status and completion are updated separately → the doctor can create a prescription → Reports reads the same tables.

AI agent flow: chat message → `POST /api/agent/chat` → pattern rules in `agent.ts` (symptom check first, then greeting/hours/fees/booking steps) → reply + next step + suggested options → on "Confirm booking", the frontend creates the patient if needed and posts the appointment through the normal API, so the double-booking check still applies.

## 8. Database Design

- `users`: id, name, email (unique), password_hash, role (owner/doctor/receptionist), created_at
- `doctors`: id, name, specialty, phone, email, fee, days, start_time, end_time, active, created_at
- `patients`: id, name, phone, email, gender, date_of_birth, address, history_notes, consent, created_at
- `appointments`: id, patient_id, doctor_id, date, time, reason, status, cancel_reason, fee, payment_status, amount_paid, created_by, created_at; unique (doctor_id, date, time, status) plus an explicit check
- `prescriptions`: id, appointment_id, patient_id, doctor_id, diagnosis_note, advice, created_at
- `prescription_items`: id, prescription_id, medicine, dosage, duration, instructions
- `support_tickets`: id, name, subject, message, priority, status, reply, created_at
- `settings`: id=1, clinic_name, phone, email, hours, default_fee, address
- `activity_log`: id, user_id, user_name, action, detail, created_at

Relationships: a doctor has many appointments; a patient has many appointments and prescriptions; an appointment has at most one prescription in this version; a prescription has many items.

## 9. API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/health | Health check |
| POST | /api/auth/login | Login, receive a JWT |
| GET | /api/auth/me | Current signed-in user |
| GET / PUT | /api/settings | Clinic settings (PUT: owner only) |
| GET / POST | /api/doctors | List / create doctors (create: owner only) |
| GET / POST | /api/patients | List / add patients (add: owner, receptionist) |
| DELETE | /api/patients/:id | Delete patient and their data (owner only) |
| GET | /api/appointments | List, filter by date/doctor/status |
| GET | /api/slots | Free 30-minute slots for a doctor and date |
| POST | /api/appointments | Book (transaction, double-booking → 409) |
| PATCH | /api/appointments/:id | Status / payment / reschedule |
| GET / POST | /api/prescriptions | List / create (create: owner, doctor) |
| GET | /api/dashboard | Today's counts and revenue |
| GET | /api/reports/summary | Range report, doctor-wise, no-shows |
| GET | /api/reports/export | CSV export |
| GET | /api/reminders | Tomorrow's appointments (in-app list only) |
| GET | /api/activity | Activity log (owner only) |
| GET / POST / PATCH | /api/support | Support tickets (PATCH: owner only) |
| POST | /api/agent/chat | AI booking assistant (pattern-based) |
| GET | /api/agent/info | Agent type and limits |
| GET / POST | /api/users | Users (owner only) |

## 10. User Interface Pages

- Login: sign in, demo logins listed and labelled DEMO ONLY.
- Dashboard: today's appointments, revenue, patients, doctors, pending balance, tomorrow's reminders, AI assistant note.
- Appointments: booking form with free-slot picker, day view, complete / no-show / cancel (reason required) / mark paid.
- Patients: add patient with consent checkbox, patient list, owner-only delete.
- Doctors: doctor cards and add-doctor form.
- Prescriptions: create form with medicine rows, history, print / Save as PDF dialog.
- Reports & Billing: date range, totals, doctor-wise counts, no-show list, CSV export.
- Support & Help: contact card, guides, FAQs, ticket form and ticket list with owner status/reply.
- Settings & Users: clinic settings, add users, activity log.
- AI Booking Assistant: floating chat widget on every signed-in page.

## 11. Privacy, Ethics and Security

- Demo data only: no real patients, no real medical records.
- Written consent is recorded before history notes are kept; parent consent for minors is required by policy.
- A patient can request deletion of all their data (owner deletes patient + appointments + prescriptions).
- Passwords are hashed, JWTs expire, roles are checked on every protected route, inputs are validated.
- The AI agent never diagnoses or prescribes, and every medical question is answered with a safe reply to see a doctor.
- No SMS/WhatsApp message is sent automatically; reminders are an in-app list.
- Keep a manual booking path for people who do not want to use the AI assistant.
- This system is not a medical device. Do not use it for real diagnosis or treatment decisions.

## 12. Testing Plan

- API tests: login rejection, unauthenticated rejection, double-booking 409, cancel-requires-reason, re-booking a cancelled slot, prescription creation, billing totals, role access (receptionist cannot list users, doctor cannot create patients), support ticket create → resolve, AI agent booking step and no-diagnosis replies, CSV export.
- UI tests: real login in a browser, every page loads, slot picker, AI chat flow including a symptom question.
- Manual checks still needed before real use: live Postgres, live deployment, real printer layout, accessibility review.

## 13. Setup Guide

Prerequisites: Node.js 20 or later, npm, Git.

Backend:
1. `cd backend && npm install`
2. Copy `.env.example` to `.env` and set `PORT`, `DATABASE_PATH` and `JWT_SECRET` (or leave the defaults for a local demo).
3. `npm run dev` — the API runs on http://localhost:4000 and creates `cliniccare.sqlite` with demo seed data on first run.

Frontend:
1. `cd frontend && npm install`
2. `npm run dev` — the app runs on http://localhost:5173 and proxies `/api` to the backend. Or `npm run build` then `npm run preview`.

Demo logins (DEMO ONLY, change or remove before any real use): owner `owner@cliniccare.local` / `demo123`, doctor `doctor@cliniccare.local` / `demo123`, receptionist `reception@cliniccare.local` / `demo123`.

## 14. Deployment

- Frontend: any static host (Vercel/Netlify) with `VITE_API_URL` pointing at the API.
- Backend: Node hosting (Render/Railway/VPS) with `DATABASE_PATH` on persistent storage, or Postgres by replacing the better-sqlite3 layer with a Postgres client (schema is documented in section 8; this was not live-tested).
- Set a long random `JWT_SECRET` and `NODE_ENV=production`. Use HTTPS.

## 15. Development Timeline

| Week | Task |
|---|---|
| 1 | Requirements, database design, auth and roles |
| 2 | Doctors, patients and consent/deletion |
| 3 | Appointments, slots and double-booking protection |
| 4 | Prescriptions, billing and reports |
| 5 | AI booking assistant (pattern-based) and safety rules |
| 6 | Support & Help, settings, activity log |
| 7 | Testing, screenshots, bug fixing |
| 8 | Deployment, documentation and demo |

## 16. Limitations

- Single clinic in version 1; no multi-branch support.
- SQLite locally; live Postgres was not tested.
- Reminders are an in-app list only; no automatic SMS/WhatsApp.
- Prescription PDF is browser print-to-PDF, not a generated PDF file.
- The AI agent is pattern-based: it understands booking, hours, doctors and fees phrasing, not free-form medical conversation — and it must never be used for medical advice.
- No real payment gateway; payments are recorded manually.
- Two receptionists booking the same slot at the exact same moment are protected by the database unique constraint, but a load/concurrency test was not run.

## 17. Future Improvements

- Postgres + live deployment, with a real PDF generator for prescriptions.
- Automatic reminders via SMS/WhatsApp only with patient consent and a real provider.
- Doctor calendar view and patient portal.
- Lab reports and insurance billing.
- A stronger, LLM-backed assistant behind the same safety rules (symptom questions still routed to a doctor), with conversation review.

## 18. Conclusion

ClinicCare shows a complete clinic workflow — doctors, patients, conflict-free booking, prescriptions, billing, reports, support and a clearly-limited AI booking assistant — in one professional, English-only system. It is built to be shown to a real clinic as a demo, with honest limits: demo data only, no diagnosis, no automatic messaging, and no real payments.

## 19. Honest demo notes (what was actually tested)

- Backend API tests: 9/9 passed (double booking, cancel/reschedule, prescription, billing, roles, support tickets, AI agent safety replies, CSV export), run with a temporary SQLite database.
- Frontend: `tsc --noEmit` passes, `vite build` passes.
- Browser verification with Playwright (real login as the demo owner): dashboard, appointments, patients, doctors, prescriptions, reports, support, settings and the AI chat all loaded; the AI chat returned the safe no-diagnosis reply to a fever/medicine question.
- Not verified: live Postgres, live deployment, real printer, real SMS/WhatsApp, payment gateway, two-user concurrency under load, accessibility audit.
