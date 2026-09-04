import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { makeId, todayInLima } from '@/lib/clinic';

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const patientId = new URL(request.url).searchParams.get('patientId');
  if (!patientId) return NextResponse.json({ error: 'Falta el paciente.' }, { status: 400 });

  try {
    const [assessment, plan, payments, supplementRows] = await Promise.all([
      env.DB.prepare(
        `SELECT reason, conditions, body_analysis AS bodyAnalysis, weight_kg AS weightKg,
                height_cm AS heightCm, bmi, healthy_weight_min_kg AS healthyWeightMinKg,
                healthy_weight_max_kg AS healthyWeightMaxKg, target_weight_kg AS targetWeightKg,
                diet_plan AS dietPlan, notes, assessed_at AS assessedAt
         FROM patient_assessments WHERE patient_id = ? ORDER BY assessed_at DESC LIMIT 1`,
      ).bind(patientId).first(),
      env.DB.prepare(
        `SELECT total_sessions AS totalSessions, used_sessions AS usedSessions,
                sessions_per_week AS sessionsPerWeek, start_date AS startDate,
                total_amount_cents AS totalAmountCents
         FROM session_packages WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1`,
      ).bind(patientId).first(),
      env.DB.prepare(
        `SELECT id, amount_cents AS amountCents, method, notes, paid_at AS paidAt
         FROM payments WHERE patient_id = ? ORDER BY paid_at DESC`,
      ).bind(patientId).all(),
      env.DB.prepare(
        `SELECT id, name, instructions, quantity, recorded_at AS recordedAt
         FROM supplements WHERE patient_id = ? ORDER BY recorded_at DESC`,
      ).bind(patientId).all(),
    ]);
    return NextResponse.json({ assessment, plan, payments: payments.results, supplements: supplementRows.results });
  } catch (error) {
    console.error('patient.record.read.failed', error);
    return NextResponse.json({ error: 'No se pudo cargar el expediente.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = (await request.json()) as {
    patientId?: string; reason?: string; conditions?: string; bodyAnalysis?: string;
    weightKg?: string | number; heightCm?: string | number; targetWeightKg?: string | number;
    dietPlan?: string; notes?: string; totalSessions?: string | number;
    sessionsPerWeek?: string | number; startDate?: string; totalAmount?: string | number;
    paymentAmount?: string | number; paymentMethod?: string;
  };
  const patientId = body.patientId?.trim() || '';
  if (!patientId || patientId.startsWith('demo-')) {
    return NextResponse.json({ error: 'Selecciona un paciente real.' }, { status: 400 });
  }

  const weightKg = numberOrNull(body.weightKg);
  const heightCm = numberOrNull(body.heightCm);
  const heightM = heightCm ? heightCm / 100 : null;
  const bmi = weightKg && heightM ? weightKg / (heightM * heightM) : null;
  const healthyWeightMinKg = heightM ? 18.5 * heightM * heightM : null;
  const healthyWeightMaxKg = heightM ? 24.9 * heightM * heightM : null;
  const targetWeightKg = numberOrNull(body.targetWeightKg);
  const now = new Date().toISOString();
  const totalSessions = Math.max(1, Math.min(99, Number(body.totalSessions) || 1));
  const sessionsPerWeek = Math.max(1, Math.min(7, Number(body.sessionsPerWeek) || 1));
  const totalAmountCents = Math.max(0, Math.round((Number(body.totalAmount) || 0) * 100));
  const paymentCents = Math.max(0, Math.round((Number(body.paymentAmount) || 0) * 100));

  try {
    const statements = [
      env.DB.prepare(
        `INSERT INTO patient_assessments
         (id, patient_id, reason, conditions, body_analysis, weight_kg, height_cm, bmi,
          healthy_weight_min_kg, healthy_weight_max_kg, target_weight_kg, diet_plan, notes, assessed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        makeId('assessment'), patientId, body.reason?.trim() || null,
        body.conditions?.trim() || null, body.bodyAnalysis?.trim() || null,
        weightKg, heightCm, bmi, healthyWeightMinKg, healthyWeightMaxKg, targetWeightKg,
        body.dietPlan?.trim() || null, body.notes?.trim() || null, now,
      ),
      env.DB.prepare(
        `UPDATE session_packages SET total_sessions = ?, sessions_per_week = ?, start_date = ?,
         total_amount_cents = ? WHERE patient_id = ?`,
      ).bind(totalSessions, sessionsPerWeek, body.startDate || todayInLima(), totalAmountCents, patientId),
      env.DB.prepare(
        `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, created_at)
         VALUES (?, ?, 'patient.assessed', 'patient', ?, ?)`,
      ).bind(makeId('audit'), user.userId, patientId, now),
    ];
    if (paymentCents > 0) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO payments (id, patient_id, amount_cents, method, notes, paid_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(makeId('payment'), patientId, paymentCents, body.paymentMethod?.trim() || null, 'Abono registrado con la evaluación', now),
      );
    }
    await env.DB.batch(statements);
    return NextResponse.json({
      bmi: bmi ? Number(bmi.toFixed(1)) : null,
      healthyWeightMinKg: healthyWeightMinKg ? Number(healthyWeightMinKg.toFixed(1)) : null,
      healthyWeightMaxKg: healthyWeightMaxKg ? Number(healthyWeightMaxKg.toFixed(1)) : null,
    });
  } catch (error) {
    console.error('patient.record.save.failed', error);
    return NextResponse.json({ error: 'No se pudo guardar la evaluación.' }, { status: 503 });
  }
}
