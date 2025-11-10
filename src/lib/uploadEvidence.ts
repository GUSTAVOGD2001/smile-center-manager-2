export const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycby6KUInjAX3XF62wQz1g-SSQ9fmq9cTAjXaThF0Tn-27EzjuKRY3Or2Wj9DwqqUcuGBCw/exec';

type EvidencePayload = {
  apiKey: string;
  action: 'evidencias.create';
  titulo: string;
  tipo: string;
  fecha: string;
  nota: string;
};

export async function uploadEvidenceWithFiles(payload: EvidencePayload, files: File[]) {
  const fd = new FormData();
  fd.append('apiKey', payload.apiKey);
  fd.append('action', payload.action);
  fd.append('titulo', payload.titulo ?? '');
  fd.append('tipo', payload.tipo ?? '');
  fd.append('fecha', payload.fecha ?? '');
  fd.append('nota', payload.nota ?? '');

  // Append files as file1, file2, file3, etc.
  files.forEach((file, i) => {
    if (!file) return;
    const safeName = file.name || `captura_${Date.now()}_${i + 1}.jpg`;
    fd.append(`file${i + 1}`, file, safeName);
  });

  const resp = await fetch(WEBAPP_URL, {
    method: 'POST',
    body: fd,
  });

  const data = await resp.json();
  console.debug('Evidencia creada:', { id: data?.id, files: data?.files?.length, folderUrl: data?.folderUrl });
  
  if (!data || data.ok !== true) {
    throw new Error(data?.error || `Error al crear evidencia: ${resp.status}`);
  }
  return data;
}

export async function uploadEvidenceWithUrls(
  payload: EvidencePayload,
  urls: { url: string; fileName?: string; mimeType?: string }[],
) {
  const body = {
    ...payload,
    files: urls.map((u) => ({
      url: u.url,
      fileName: u.fileName || `foto_${Date.now()}.jpg`,
      mimeType: u.mimeType || 'image/jpeg',
    })),
  };
  const resp = await fetch(WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error('Upload JSON failed');
  return await resp.json();
}
