function fromSerialToDate(serial: number) {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms);
}

export function parseAnyDate(value: string | number | Date): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return fromSerialToDate(value);
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateDMY(value: string | number | Date) {
  const d = parseAnyDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Mexico_City'
  }).format(d);
}
