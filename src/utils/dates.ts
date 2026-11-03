/** "2026-03-12" in the device's time zone, the format the server stores dates in. */
export function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** A date from the server ("2026-03-12" or a full timestamp), as a local date, or null if it can't be read. */
export function fromIsoDate(value: unknown): Date | null {
  const text = typeof value === 'string' ? value.trim() : '';
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function endOfToday() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}

/** Whole years between a birth date and today. */
export function ageOn(birth: Date, today = new Date()) {
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}
