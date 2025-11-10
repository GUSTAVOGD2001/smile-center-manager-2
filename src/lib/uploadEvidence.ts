export const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycby6KUInjAX3XF62wQz1g-SSQ9fmq9cTAjXaThF0Tn-27EzjuKRY3Or2Wj9DwqqUcuGBCw/exec';

type EvidencePayload = {
  apiKey: string;
  action: 'evidencias.create';
  titulo: string;
  tipo: string;
  fecha: string;
  nota: string;
};

// Convierte File -> base64 (solo la parte después de la coma)
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const commaIndex = result.indexOf(',');
      // "data:image/jpeg;base64,XXXX" -> "XXXX"
      const base64 = commaIndex >= 0 ? result.substring(commaIndex + 1) : result;
      resolve(base64);
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function uploadEvidenceWithFiles(payload: EvidencePayload, files: File[]) {
  const filesArray = Array.isArray(files) ? files : [];

  // 1) Convertir todos los archivos a {fileName, mimeType, base64}
  const filesPayload = await Promise.all(
    filesArray
      .filter((f) => !!f)
      .map(async (file, idx) => ({
        fileName: file.name || `archivo_${Date.now()}_${idx + 1}.jpg`,
        mimeType: file.type || 'application/octet-stream',
        base64: await fileToBase64(file),
      }))
  );

  // 2) JSON que espera Apps Script
  const body = {
    apiKey: payload.apiKey,                       // "Tamarindo123456"
    action: payload.action ?? 'evidencias.create',
    titulo: payload.titulo ?? '',
    tipo:   payload.tipo   ?? '',
    fecha:  payload.fecha  ?? '',
    nota:   payload.nota   ?? '',
    files:  filesPayload,
  };

  // 3) IMPORTANTE: NO usar application/json para evitar CORS
  const resp = await fetch(WEBAPP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8', // 👈 CLAVE para que no haya preflight
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }

  const data = await resp.json();
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
