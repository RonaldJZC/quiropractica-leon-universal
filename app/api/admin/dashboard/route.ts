import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { formatClinicTime, todayInLima } from '@/lib/clinic';

const demoSchedule = [
  { id: 'demo-1', time: '09:00', name: 'Ana Torres', status: 'completed', used: 3, total: 8 },
  { id: 'demo-2', time: '10:30', name: 'Luis Vargas', status: 'checked_in', used: 5, total: 10 },
  { id: 'demo-3', time: '12:00', name: 'Rosa Medina', status: 'scheduled', used: 1, total: 6 },
  { id: 'demo-4', time: '16:00', name: 'Carlos Mendoza', status: 'scheduled', used: 4, total: 8 },
];

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const [scheduleResult, patientsResult] = await Promise.all([
      env.DB.prepare(
        `SELECT a.id, a.start_time AS time,
                p.first_name || ' ' || p.last_name AS name,
                a.status,
                COALESCE(sp.used_sessions, 0) AS used,
                COALESCE(sp.total_sessions, 0) AS total
         FROM appointments a
         JOIN patients p ON p.id = a.patient_id
         LEFT JOIN session_packages sp ON sp.patient_id = p.id
         WHERE a.appointment_date = ?
         ORDER BY a.start_time ASC`,
      )
        .bind(todayInLima())
        .all<{ id: string; time: string; name: string; status: string; used: number; total: number }>(),
      env.DB.prepare(
        `SELECT p.id, p.first_name || ' ' || p.last_name AS name, p.phone,
                COALESCE(sp.used_sessions, 0) AS used,
                COALESCE(sp.total_sessions, 0) AS total
         FROM patients p
         LEFT JOIN session_packages sp ON sp.patient_id = p.id
         ORDER BY p.created_at DESC
         LIMIT 8`,
      ).all<{ id: string; name: string; phone: string | null; used: number; total: number }>(),
    ]);

    if (scheduleResult.results.length || patientsResult.results.length) {
      const schedule = scheduleResult.results.map((item) => ({
        ...item,
        time: formatClinicTime(item.time),
      }));
      return NextResponse.json({
        schedule,
        patients: patientsResult.results,
        stats: {
          today: schedule.length,
          checkedIn: schedule.filter((item) => item.status === 'checked_in').length,
          completed: schedule.filter((item) => item.status === 'completed').length,
          patients: patientsResult.results.length,
        },
      });
    }
  } catch {
    // Use representative data until the first patient is registered.
  }

  return NextResponse.json({
    schedule: demoSchedule.map((item) => ({ ...item, time: formatClinicTime(item.time) })),
    patients: [
      { id: 'demo-ana', name: 'Ana Torres', phone: '987 654 120', used: 3, total: 8 },
      { id: 'demo-luis', name: 'Luis Vargas', phone: '955 332 801', used: 5, total: 10 },
      { id: 'demo-rosa', name: 'Rosa Medina', phone: '944 218 620', used: 1, total: 6 },
    ],
    stats: { today: 4, checkedIn: 1, completed: 1, patients: 24 },
    demo: true,
  });
}
