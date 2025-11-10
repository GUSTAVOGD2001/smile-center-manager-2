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
  const fileToBase64 = (file: File) => new Promise<string>((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      res(base64);
    };
    reader.onerror = (error) => rej(new Error(`Error al leer archivo: ${error}`));
    reader.readAsDataURL(file);
  });

  try {
    const filesPayload = await Promise.all(
      files.map(async (file, i) => ({
        fileName: file.name || `archivo_${i + 1}.jpg`,
        mimeType: file.type || 'application/octet-stream',
        base64: await fileToBase64(file),
      }))
    );

    const body = {
      apiKey: payload.apiKey,
      action: 'evidencias.create',
      titulo: payload.titulo || '',
      tipo: payload.tipo || '',
      fecha: payload.fecha || '',
      nota: payload.nota || '',
      files: filesPayload,
    };

    const resp = await fetch(WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      throw new Error(`Error del servidor: ${resp.status} ${resp.statusText}`);
    }

    const data = await resp.json();

    if (!data || data.ok !== true) {
      throw new Error(data?.error || 'La respuesta del servidor indica un error');
    }

    console.debug('Evidencia creada:', { 
      id: data?.id, 
      files: data?.files?.length, 
      folderUrl: data?.folderUrl 
    });

    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Error de conexión. Verifica tu conexión a internet e intenta nuevamente.');
    }
    throw error;
  }
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
