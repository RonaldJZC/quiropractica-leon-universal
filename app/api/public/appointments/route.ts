import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { formatClinicTime, normalizeSearch, todayInLima } from '@/lib/clinic';

const demoAppointments = [
  { appointmentId: 'demo-carlos', firstName: 'Carlos', lastInitial: 'M.', time: '16:00' },
  { appointmentId: 'demo-maria', firstName: 'María', lastInitial: 'R.', time: '17:30' },
  { appointmentId: 'demo-jose', firstName: 'José', lastInitial: 'S.', time: '18:15' },
];

export async function GET(request: Request) {
  const query = normalizeSearch(new URL(request.url).searchParams.get('q') ?? '');
  if (query.length < 3) return NextResponse.json({ appointments: [] });

  try {
    const result = await env.DB.prepare(
      `SELECT a.id AS appointmentId, p.first_name AS firstName,
              substr(p.last_name, 1, 1) || '.' AS lastInitial,
              a.start_time AS time
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       WHERE a.appointment_date = ?
         AND a.status IN ('scheduled', 'checked_in')
         AND p.search_name LIKE ?
       ORDER BY a.start_time ASC
       LIMIT 6`,
    )
      .bind(todayInLima(), `%${query}%`)
      .all<{
        appointmentId: string;
        firstName: string;
        lastInitial: string;
        time: string;
      }>();

    if (result.results.length > 0) {
      return NextResponse.json({
        appointments: result.results.map((item) => ({
          ...item,
          time: formatClinicTime(item.time),
        })),
      });
    }
  } catch {
    // The public demo remains usable before the first database migration.
  }

  const appointments = demoAppointments
    .filter((item) =>
      normalizeSearch(`${item.firstName} ${item.lastInitial}`).includes(query),
    )
    .map((item) => ({ ...item, time: formatClinicTime(item.time) }));
  return NextResponse.json({ appointments, demo: true });
}
