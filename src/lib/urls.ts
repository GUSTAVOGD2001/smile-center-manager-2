export function buildReciboUrl(id: string, format: "a4" | "pos58" = "a4") {
  const base = "https://script.google.com/macros/s/AKfycbwF-dEFJO1lJsPplWf7SO5U3JwG9dTrQ4pWBTLuxS8jVokDLyeVumrCIowqkfDqUmMBQQ/exec";
  const params = new URLSearchParams({ id, format });
  return `${base}?${params.toString()}`;
}
