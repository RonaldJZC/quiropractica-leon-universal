import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import {
  generatePin,
  hashPin,
  makeId,
  normalizeSearch,
  todayInLima,
} from '@/lib/clinic';

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    phone?: string;
    birthDate?: string;
    sex?: string;
    totalSessions?: number;
    appointmentDate?: string;
    appointmentTime?: string;
  };

  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  if (!firstName || !lastName) {
    return NextResponse.json({ error: 'Nombre y apellido son obligatorios.' }, { status: 400 });
  }

  const patientId = makeId('patient');
  const pin = generatePin();
  const now = new Date().toISOString();
  const appointmentDate = body.appointmentDate || todayInLima();
  const totalSessions = Math.max(1, Math.min(99, Number(body.totalSessions) || 1));

  try {
    const statements = [
      env.DB.prepare(
        `INSERT INTO patients
         (id, first_name, last_name, search_name, birth_date, sex, phone, email, pin_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      ).bind(
        patientId,
        firstName,
        lastName,
        normalizeSearch(`${firstName} ${lastName}`),
        body.birthDate || null,
        body.sex || null,
        body.phone?.trim() || null,
        await hashPin(pin),
        now,
      ),
      env.DB.prepare(
        `INSERT INTO session_packages
         (id, patient_id, total_sessions, used_sessions, created_at)
         VALUES (?, ?, ?, 0, ?)`,
      ).bind(makeId('package'), patientId, totalSessions, now),
      env.DB.prepare(
        `INSERT INTO audit_logs
         (id, actor_id, action, entity_type, entity_id, created_at)
         VALUES (?, ?, 'patient.created', 'patient', ?, ?)`,
      ).bind(makeId('audit'), user.userId, patientId, now),
    ];

    if (body.appointmentTime) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO appointments
           (id, patient_id, appointment_date, start_time, duration_minutes, status, reason, created_at)
           VALUES (?, ?, ?, ?, 45, 'scheduled', NULL, ?)`,
        ).bind(makeId('appointment'), patientId, appointmentDate, body.appointmentTime, now),
      );
    }

    await env.DB.batch(statements);
    return NextResponse.json({ patientId, pin, firstName, lastName });
  } catch {
    return NextResponse.json(
      { error: 'No se pudo guardar al paciente. Inténtalo nuevamente.' },
      { status: 503 },
    );
  }
}
