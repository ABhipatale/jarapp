// Formatting + date helpers. All dates travel to the API as YYYY-MM-DD (local time).

export function toISODate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today() {
  return toISODate(new Date());
}

export function parseISODate(s) {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Monday of the week containing `iso`. */
export function weekStart(iso = today()) {
  const d = parseISODate(iso);
  const dow = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - dow);
  return toISODate(d);
}

export function monthStart(iso = today()) {
  return String(iso).slice(0, 7) + '-01';
}

export function monthEnd(iso = today()) {
  const d = parseISODate(monthStart(iso));
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/** Named ranges used by the dashboard filter. */
export function rangeFor(key) {
  const t = today();
  switch (key) {
    case 'yesterday': {
      const y = addDays(t, -1);
      return { from: y, to: y };
    }
    case 'week':
      return { from: weekStart(t), to: t };
    case 'month':
      return { from: monthStart(t), to: t };
    default:
      return { from: t, to: t };
  }
}

/** 01/10/2026 */
export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** Tue, 1 Oct 2026 */
export function fmtLongDate(iso = today()) {
  return parseISODate(iso).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** ₹1,250 or ₹1,250.50 */
export function money(v) {
  const n = num(v);
  const hasPaise = Math.round(n * 100) % 100 !== 0;
  return '₹' + n.toLocaleString('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/** Round to paise, avoids 0.1+0.2 style drift in live previews. */
export function round2(v) {
  return Math.round(num(v) * 100) / 100;
}

export function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
