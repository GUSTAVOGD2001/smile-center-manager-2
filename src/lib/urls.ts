export const PENDIENTES_API_URL = "https://script.google.com/macros/s/AKfycbwPjMMUiIYdEj2cbhPAB5RX-sd0M3zvBR5Pf4A3Z9JvccOoxO7ATSJ1VuhiSGUNdScuAg/exec";
export const PENDIENTES_API_KEY = "123Tamarindo";

export function buildReciboUrl(id: string, format: "a4" | "pos58" = "a4") {
  const base = "https://script.google.com/macros/s/AKfycbwF-dEFJO1lJsPplWf7SO5U3JwG9dTrQ4pWBTLuxS8jVokDLyeVumrCIowqkfDqUmMBQQ/exec";
  const params = new URLSearchParams({ id, format });
  return `${base}?${params.toString()}`;
}
