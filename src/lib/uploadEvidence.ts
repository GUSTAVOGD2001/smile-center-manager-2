import { EVIDENCIAS_WEBAPP, EVIDENCIAS_TOKEN } from '@/lib/config';

export type EvidencePayload = {
  action?: string; // default: 'evidencias.create'
  titulo: string;
  tipo: string;
  fecha: string;
  nota: string;
};

export async function uploadEvidenceWithFiles(payload: EvidencePayload, files: File[]) {
  const fd = new FormData();
  fd.append('token', EVIDENCIAS_TOKEN);
  fd.append('action', payload.action || 'evidencias.create');
  fd.append('titulo', payload.titulo ?? '');
  fd.append('tipo', payload.tipo ?? '');
  fd.append('fecha', payload.fecha ?? '');
  fd.append('nota', payload.nota ?? '');

  // Importante: file1, file2, ... (GAS los lee como e.files)
  files.forEach((file, i) => fd.append(`file${i + 1}`, file, file.name));

  console.log('Uploading evidence with files:', {
    titulo: payload.titulo,
    tipo: payload.tipo,
    fecha: payload.fecha,
    filesCount: files.length
  });

  const resp = await fetch(EVIDENCIAS_WEBAPP, { method: 'POST', body: fd });
  const data = await resp.json();
  console.log('Upload response:', data);

  if (!resp.ok || !data?.ok) {
    throw new Error(data?.error || `Upload failed: ${resp.status}`);
  }
  return data; // data.files debe venir lleno
}
