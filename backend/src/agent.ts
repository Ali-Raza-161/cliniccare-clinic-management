// Pattern / rule-based demo agent. NOT an LLM, no API key, no diagnosis.
// Every symptom/medical question gets the safe reply below.
export const AGENT_DISCLAIMER = 'I am a demo booking assistant. I do not diagnose, prescribe, or give medical advice. For any health concern, please see a doctor in person.';
const SAFE_REPLY = 'I cannot help with symptoms, diagnosis, or treatment advice. ' + AGENT_DISCLAIMER + ' I can help you book an appointment, or tell you about clinic hours, doctors, services and fees. Would you like to book an appointment?';
const SYMPTOM_WORDS = ['pain', 'fever', 'cough', 'headache', 'symptom', 'diagnos', 'disease', 'medicine', 'prescri', 'treatment', 'cure', 'infection', 'blood pressure', 'diabetes', 'chest', 'stomach', 'hurt', 'sick', 'illness', 'dose', 'dosage'];

export interface AgentContext { step?: string; doctorId?: number; doctorName?: string; date?: string; time?: string; patientName?: string; }
export interface AgentReply { reply: string; intent: string; step: string; context: AgentContext; options?: string[]; }

export function agentReply(message: string, ctx: AgentContext, doctors: any[], settings: any): AgentReply {
  const text = message.trim().toLowerCase();
  const base: AgentContext = { ...ctx };
  if (SYMPTOM_WORDS.some(w => text.includes(w))) {
    return { reply: SAFE_REPLY, intent: 'medical_question', step: base.step || 'start', context: base };
  }
  if (/\b(hi|hello)\b/.test(text) || text === 'start') {
    return { reply: `Hello, I am the ClinicCare booking assistant (demo). ${AGENT_DISCLAIMER} I can help you book an appointment or answer questions about hours, doctors, services and fees. What would you like to do?`, intent: 'greeting', step: 'start', context: base, options: ['Book an appointment', 'Clinic hours', 'Doctors and fees'] };
  }
  if (text.includes('hour') || text.includes('open') || text.includes('timing') || text.includes('when')) {
    return { reply: `Our clinic hours are: ${settings?.hours || 'Mon-Sat, 9:00 AM - 5:00 PM'}. ${AGENT_DISCLAIMER}`, intent: 'hours', step: 'start', context: base };
  }
  if (text.includes('fee') || text.includes('price') || text.includes('cost') || text.includes('doctor')) {
    const list = doctors.map((d: any) => `${d.name} (${d.specialty}) — PKR ${d.fee}`).join('; ');
    return { reply: `Our doctors: ${list}. Consultation fees start at PKR ${settings?.default_fee || 1000}. Would you like to book an appointment?`, intent: 'doctors_fees', step: 'choose_doctor', context: base, options: doctors.map((d: any) => d.name) };
  }
  if (text.includes('service') || text.includes('what do you')) {
    return { reply: 'We offer general checkups, follow-up visits, specialist consultations, prescriptions and billing at the clinic. For anything medical, please see a doctor in person — I do not give medical advice.', intent: 'services', step: 'start', context: base };
  }
  if (text.includes('book') || text.includes('appointment') || base.step === 'choose_doctor') {
    if (base.step !== 'choose_doctor' && base.step !== 'choose_date' && base.step !== 'choose_time' && base.step !== 'choose_name') {
      return { reply: 'Sure — which doctor would you like to see?', intent: 'booking_start', step: 'choose_doctor', context: base, options: doctors.map((d: any) => d.name) };
    }
    if (base.step === 'choose_doctor') {
      const doc = doctors.find((d: any) => text.includes(d.name.toLowerCase()) || text.includes(d.specialty.toLowerCase()));
      if (!doc) return { reply: 'Please choose one of our doctors:', intent: 'booking_doctor', step: 'choose_doctor', context: base, options: doctors.map((d: any) => d.name) };
      return { reply: `Great, ${doc.name} (${doc.specialty}, PKR ${doc.fee}). Which date would you like? Please use YYYY-MM-DD, for example 2026-10-28.`, intent: 'booking_doctor', step: 'choose_date', context: { ...base, doctorId: doc.id, doctorName: doc.name } };
    }
    if (base.step === 'choose_date') {
      const m = text.match(/(\d{4}-\d{2}-\d{2})/);
      if (!m) return { reply: 'Please give a date in YYYY-MM-DD format, for example 2026-10-28.', intent: 'booking_date', step: 'choose_date', context: base };
      return { reply: `Date ${m[1]} noted. Which time? Our slots are every 30 minutes from 09:00 to 17:00, for example 10:00.`, intent: 'booking_date', step: 'choose_time', context: { ...base, date: m[1] } };
    }
    if (base.step === 'choose_time') {
      const m = text.match(/(\d{1,2}:\d{2})/);
      if (!m) return { reply: 'Please give a time like 10:00 or 14:30.', intent: 'booking_time', step: 'choose_time', context: base };
      return { reply: `Time ${m[1]} noted. What is the patient name?`, intent: 'booking_time', step: 'choose_name', context: { ...base, time: m[1] } };
    }
    if (base.step === 'choose_name') {
      const name = message.trim();
      return { reply: `Summary for the doctor: ${name} — ${base.doctorName || 'doctor'} on ${base.date} at ${base.time}. Please confirm to create this booking, or ask reception to confirm it. ${AGENT_DISCLAIMER}`, intent: 'booking_summary', step: 'confirm', context: { ...base, patientName: name }, options: ['Confirm booking'] };
    }
  }
  if (text.includes('confirm') && base.step === 'confirm') {
    return { reply: 'Booking details are ready. Reception can create it from the Appointments page, or use the Confirm button in the chat to create it now.', intent: 'booking_confirm', step: 'confirm', context: base };
  }
  if (text.includes('cancel') || text.includes('reschedul')) {
    return { reply: 'To cancel or reschedule, please contact reception or use the Appointments page. I cannot change an existing booking from this chat.', intent: 'cancel_info', step: 'start', context: base };
  }
  return { reply: `I can help with booking an appointment, clinic hours, doctors and fees. ${AGENT_DISCLAIMER} What would you like to do?`, intent: 'fallback', step: 'start', context: base, options: ['Book an appointment', 'Clinic hours', 'Doctors and fees'] };
}
