import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { makeId } from '@/lib/clinic';

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const data = await request.formData();
  const file = data.get('file');
  const patientValue = data.get('patientId');
  const categoryValue = data.get('category');
  const patientId = typeof patientValue === 'string' ? patientValue : '';
  const category = typeof categoryValue === 'string' ? categoryValue : 'before';
  if (!(file instanceof File) || !patientId) {
    return NextResponse.json({ error: 'Selecciona un paciente y una fotografía.' }, { status: 400 });
  }
  if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'La imagen debe pesar menos de 8 MB.' }, { status: 400 });
  }

  const mediaId = makeId('media');
  const extension = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
  const objectKey = `patients/${patientId}/${mediaId}.${extension}`;
  const now = new Date().toISOString();

  try {
    await env.FILES.put(objectKey, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { patientId, category },
    });
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO media_files
         (id, patient_id, visit_id, object_key, file_name, content_type, category, created_at)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`,
      ).bind(mediaId, patientId, objectKey, file.name, file.type, category, now),
      env.DB.prepare(
        `INSERT INTO audit_logs
         (id, actor_id, action, entity_type, entity_id, created_at)
         VALUES (?, ?, 'media.uploaded', 'media', ?, ?)`,
      ).bind(makeId('audit'), user.userId, mediaId, now),
    ]);
    return NextResponse.json({ id: mediaId, fileName: file.name });
  } catch {
    return NextResponse.json({ error: 'No se pudo guardar la fotografía.' }, { status: 503 });
  }
}
