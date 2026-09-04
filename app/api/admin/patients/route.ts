import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import {
  generatePin,
  generatePatientQrToken,
  hashPin,
  makePatientQrValue,
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
  const qrToken = generatePatientQrToken();
  const now = new Date().toISOString();
  const appointmentDate = body.appointmentDate || todayInLima();
  const totalSessions = Math.max(1, Math.min(99, Number(body.totalSessions) || 1));

  try {
    const statements = [
      env.DB.prepare(
        `INSERT INTO patients
         (id, first_name, last_name, search_name, birth_date, sex, phone, email, pin_hash, qr_token, qr_issued_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
      ).bind(
        patientId,
        firstName,
        lastName,
        normalizeSearch(`${firstName} ${lastName}`),
        body.birthDate || null,
        body.sex || null,
        body.phone?.trim() || null,
        await hashPin(pin),
        qrToken,
        now,
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
    return NextResponse.json({
      patientId,
      firstName,
      lastName,
      qrValue: makePatientQrValue(qrToken),
    });
  } catch (error) {
    console.error('patient.create.failed', error);
    return NextResponse.json(
      { error: 'No se pudo guardar al paciente. Inténtalo nuevamente.' },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = (await request.json()) as { patientId?: string };
  if (!body.patientId || body.patientId.startsWith('demo-')) {
    return NextResponse.json(
      { error: 'Selecciona un paciente real para renovar su QR.' },
      { status: 400 },
    );
  }

  const qrToken = generatePatientQrToken();
  const now = new Date().toISOString();
  try {
    const patient = await env.DB.prepare(
      `SELECT first_name AS firstName, last_name AS lastName
       FROM patients WHERE id = ? LIMIT 1`,
    )
      .bind(body.patientId)
      .first<{ firstName: string; lastName: string }>();
    if (!patient) {
      return NextResponse.json({ error: 'Paciente no encontrado.' }, { status: 404 });
    }

    await env.DB.batch([
      env.DB.prepare(
        `UPDATE patients SET qr_token = ?, qr_issued_at = ? WHERE id = ?`,
      ).bind(qrToken, now, body.patientId),
      env.DB.prepare(
        `INSERT INTO audit_logs
         (id, actor_id, action, entity_type, entity_id, created_at)
         VALUES (?, ?, 'patient.qr_renewed', 'patient', ?, ?)`,
      ).bind(makeId('audit'), user.userId, body.patientId, now),
    ]);

    return NextResponse.json({
      firstName: patient.firstName,
      lastName: patient.lastName,
      qrValue: makePatientQrValue(qrToken),
    });
  } catch {
    return NextResponse.json(
      { error: 'No se pudo generar la tarjeta QR.' },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = (await request.json()) as { patientId?: string };
  if (!body.patientId || body.patientId.startsWith('demo-')) {
    return NextResponse.json({ error: 'Selecciona un paciente real.' }, { status: 400 });
  }
  try {
    const files = await env.DB.prepare(
      'SELECT object_key AS objectKey FROM media_files WHERE patient_id = ?',
    ).bind(body.patientId).all<{ objectKey: string }>();
    await Promise.all(files.results.map((file) => env.FILES.delete(file.objectKey)));
    await env.DB.prepare('DELETE FROM patients WHERE id = ?').bind(body.patientId).run();
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('patient.delete.failed', error);
    return NextResponse.json({ error: 'No se pudo eliminar el paciente.' }, { status: 503 });
  }
}
