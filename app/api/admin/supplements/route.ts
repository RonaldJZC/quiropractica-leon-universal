import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { makeId } from '@/lib/clinic';

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = (await request.json()) as {
    patientId?: string;
    name?: string;
    instructions?: string;
    quantity?: string;
    lotNumber?: string;
    expiresAt?: string;
  };
  if (!body.patientId || !body.name?.trim()) {
    return NextResponse.json({ error: 'Selecciona un paciente e indica el suplemento.' }, { status: 400 });
  }

  if (body.patientId.startsWith('demo-')) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const supplementId = makeId('supplement');
  const now = new Date().toISOString();
  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO supplements
         (id, patient_id, name, instructions, quantity, lot_number, expires_at, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        supplementId,
        body.patientId,
        body.name.trim(),
        body.instructions?.trim() || null,
        body.quantity?.trim() || null,
        body.lotNumber?.trim() || null,
        body.expiresAt || null,
        now,
      ),
      env.DB.prepare(
        `INSERT INTO audit_logs
         (id, actor_id, action, entity_type, entity_id, created_at)
         VALUES (?, ?, 'supplement.created', 'supplement', ?, ?)`,
      ).bind(makeId('audit'), user.userId, supplementId, now),
    ]);
    return NextResponse.json({ ok: true, id: supplementId });
  } catch {
    return NextResponse.json({ error: 'No se pudo guardar el suplemento.' }, { status: 503 });
  }
}
