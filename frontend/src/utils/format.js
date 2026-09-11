const numberFormat = new Intl.NumberFormat('en-US');
const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export const RECEIPT_THRESHOLD = Number(import.meta.env.VITE_RECEIPT_THRESHOLD ?? 5000000);

export const formatNumber = (value) => numberFormat.format(value ?? 0);

export const formatToman = (value) => `${formatNumber(value)} T`;

export const formatDate = (value) => (value ? dateFormat.format(new Date(value)) : '-');

export const shortId = (id) => (id ? `${id.slice(0, 8)}…` : '-');

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';

export function parseAmount(input) {
  const digits = String(input ?? '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}
