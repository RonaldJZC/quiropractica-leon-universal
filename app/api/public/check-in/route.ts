import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import {
  CLINIC_QR_CODE,
  formatClinicTime,
  hashPin,
  makeId,
  todayInLima,
} from '@/lib/clinic';

const demoCodes: Record<string, { pin: string; firstName: string; time: string }> = {
  'demo-carlos': { pin: '482731', firstName: 'Carlos', time: '16:00' },
  'demo-maria': { pin: '274915', firstName: 'María', time: '17:30' },
  'demo-jose': { pin: '613482', firstName: 'José', time: '18:15' },
};

function readQrCode(value: string) {
  if (value === CLINIC_QR_CODE) return value;
  try {
    return new URL(value).searchParams.get('qr');
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    appointmentId?: string;
    pin?: string;
    qrCode?: string;
  };

  if (!body.appointmentId || !/^\d{6}$/.test(body.pin ?? '')) {
    return NextResponse.json(
      { error: 'Revisa la cita seleccionada y el código personal.' },
      { status: 400 },
    );
  }

  if (readQrCode(body.qrCode ?? '') !== CLINIC_QR_CODE) {
    return NextResponse.json(
      { error: 'Este QR no pertenece a la entrada de la clínica.' },
      { status: 400 },
    );
  }

  const demo = demoCodes[body.appointmentId];
  if (demo) {
    if (demo.pin !== body.pin) {
      return NextResponse.json({ error: 'El código personal no es correcto.' }, { status: 401 });
    }
    return NextResponse.json({
      firstName: demo.firstName,
      appointmentTime: formatClinicTime(demo.time),
      checkedInAt: new Date().toISOString(),
      demo: true,
    });
  }

  try {
    const appointment = await env.DB.prepare(
      `SELECT a.id AS appointmentId, a.patient_id AS patientId,
              a.start_time AS startTime, a.status AS status,
              p.first_name AS firstName, p.pin_hash AS pinHash
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       WHERE a.id = ? AND a.appointment_date = ?
       LIMIT 1`,
    )
      .bind(body.appointmentId, todayInLima())
      .first<{
        appointmentId: string;
        patientId: string;
        startTime: string;
        status: string;
        firstName: string;
        pinHash: string;
      }>();

    if (!appointment) {
      return NextResponse.json({ error: 'No encontramos una cita válida para hoy.' }, { status: 404 });
    }
    if ((await hashPin(body.pin!)) !== appointment.pinHash) {
      return NextResponse.json({ error: 'El código personal no es correcto.' }, { status: 401 });
    }

    const checkedInAt = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT OR IGNORE INTO check_ins
         (id, appointment_id, patient_id, location_code, checked_in_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).bind(
        makeId('checkin'),
        appointment.appointmentId,
        appointment.patientId,
        CLINIC_QR_CODE,
        checkedInAt,
      ),
      env.DB.prepare(
        `UPDATE appointments
         SET status = 'checked_in'
         WHERE id = ? AND status = 'scheduled'`,
      ).bind(appointment.appointmentId),
    ]);

    return NextResponse.json({
      firstName: appointment.firstName,
      appointmentTime: formatClinicTime(appointment.startTime),
      checkedInAt,
    });
  } catch {
    return NextResponse.json(
      { error: 'No pudimos registrar la llegada. Pide ayuda al profesional.' },
      { status: 503 },
    );
  }
}
