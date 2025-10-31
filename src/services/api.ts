export async function actualizarDisenador(params: { id: string; disenador: string }) {
  const { id, disenador } = params;
  const url = import.meta.env.VITE_API_UPDATE_URL;
  if (!url) throw new Error("Falta VITE_API_UPDATE_URL en variables de entorno");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, disenador }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${errText ? `: ${errText}` : ""}`);
  }

  const ctype = res.headers.get("content-type") || "";
  let data: any = null;

  if (ctype.includes("application/json")) {
    data = await res.json().catch(() => null);
  } else {
    const txt = await res.text().catch(() => "");
    try {
      data = txt ? JSON.parse(txt) : null;
    } catch {
      data = { ok: true, raw: txt };
    }
  }

  if (!data || data.ok !== true) {
    const msg = (data && (data.error || data.message)) || "Respuesta inesperada del servidor";
    throw new Error(msg);
  }

  return data as { ok: true; id: string; field?: string; value?: string };
}
