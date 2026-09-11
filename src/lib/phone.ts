/** Strip everything except digits, max 10. */
export function parsePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}

/** Format stored digits as (XXX) XXX-XXXX. */
export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** True only when exactly 10 digits have been entered. */
export function isValidPhone(digits: string): boolean {
  return digits.replace(/\D/g, "").length === 10;
}
