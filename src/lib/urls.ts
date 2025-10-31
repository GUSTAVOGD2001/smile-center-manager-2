const GAS_BASE = import.meta.env.VITE_API_UPDATE_URL?.replace(/\/exec.*/, "/exec");

export function buildReciboUrl(id: string, format: "a4" | "pos58" = "a4") {
  const base = GAS_BASE || "https://script.google.com/macros/s/AKfyxxxx/exec";
  const params = new URLSearchParams({ id, format });
  return `${base}?${params.toString()}`;
}
