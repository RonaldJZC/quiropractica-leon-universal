import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { makeId } from '@/lib/clinic';

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = (await request.json()) as { appointmentId?: string; status?: string };
  if (!body.appointmentId || !['in_session', 'completed', 'cancelled', 'no_show'].includes(body.status ?? '')) {
    return NextResponse.json({ error: 'Estado no válido.' }, { status: 400 });
  }

  if (body.appointmentId.startsWith('demo-')) {
    return NextResponse.json({ ok: true, demo: true });
  }

  try {
    const appointment = await env.DB.prepare(
      'SELECT patient_id AS patientId, status FROM appointments WHERE id = ? LIMIT 1',
    )
      .bind(body.appointmentId)
      .first<{ patientId: string; status: string }>();
    if (!appointment) return NextResponse.json({ error: 'Cita no encontrada.' }, { status: 404 });

    const now = new Date().toISOString();
    const statements = [
      env.DB.prepare('UPDATE appointments SET status = ? WHERE id = ?').bind(
        body.status,
        body.appointmentId,
      ),
      env.DB.prepare(
        `INSERT INTO audit_logs
         (id, actor_id, action, entity_type, entity_id, created_at)
         VALUES (?, ?, ?, 'appointment', ?, ?)`,
      ).bind(makeId('audit'), user.userId, `appointment.${body.status}`, body.appointmentId, now),
    ];

    if (body.status === 'completed' && appointment.status !== 'completed') {
      statements.push(
        env.DB.prepare(
          `UPDATE session_packages
           SET used_sessions = used_sessions + 1
           WHERE patient_id = ? AND used_sessions < total_sessions`,
        ).bind(appointment.patientId),
        env.DB.prepare(
          `INSERT INTO clinical_visits
           (id, appointment_id, patient_id, weight_kg, height_cm, pain_level, notes, completed_at, created_at)
           VALUES (?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)`,
        ).bind(makeId('visit'), body.appointmentId, appointment.patientId, now, now),
      );
    }

    await env.DB.batch(statements);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'No se pudo actualizar la cita.' }, { status: 503 });
  }
}
