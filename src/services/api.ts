export type UpdateEstadoPayload = { id: string; nuevoEstado: string };

export type OrdenResumen = {
  id: string;
  timestamp?: string;
  estado?: string;
  disenador?: string;
  repartidor?: string;
  [key: string]: unknown;
};

function ensureJsonOk(res: Response) {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function parseJsonSafe(res: Response) {
  const ctype = res.headers.get("content-type") || "";
  if (ctype.includes("application/json")) return res.json();
  const txt = await res.text().catch(() => "");
  try {
    return txt ? JSON.parse(txt) : null;
  } catch {
    return { ok: true, raw: txt };
  }
}

export async function actualizarDisenador(params: { id: string; disenador: string }) {
  const { id, disenador } = params;
  const url = import.meta.env.VITE_API_UPDATE_URL;
  if (!url) throw new Error("Falta VITE_API_UPDATE_URL en variables de entorno");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, disenador }),
  });

  ensureJsonOk(res);
  const data = await parseJsonSafe(res);

  if (!data || data.ok !== true) {
    const msg = (data && (data.error || data.message)) || "Respuesta inesperada del servidor";
    throw new Error(msg);
  }

  return data as { ok: true; id: string; field?: string; value?: string };
}

export async function actualizarEstadoOrden({ id, nuevoEstado }: UpdateEstadoPayload) {
  const url = import.meta.env.VITE_API_UPDATE_URL;
  if (!url) throw new Error("Falta VITE_API_UPDATE_URL");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "updateEstado", id, estado: nuevoEstado }),
  });
  ensureJsonOk(res);
  const data = await parseJsonSafe(res);
  if (!data || data.ok !== true) throw new Error(data?.error || "Respuesta inesperada");
  return data as { ok: true; id: string; estado: string };
}

export async function obtenerOrdenesPorFecha(fechaISO: string) {
  const baseUrl = import.meta.env.VITE_API_UPDATE_URL;
  if (!baseUrl) throw new Error("Falta VITE_API_UPDATE_URL");
  const url = new URL(String(baseUrl));
  url.searchParams.set("action", "listByDate");
  url.searchParams.set("date", fechaISO);

  const res = await fetch(url.toString(), { method: "GET" });
  ensureJsonOk(res);
  const data = await parseJsonSafe(res);
  if (!data || data.ok !== true || !Array.isArray(data.items)) {
    throw new Error(data?.error || "No se pudieron obtener las órdenes");
  }
  return data.items as OrdenResumen[];
}
