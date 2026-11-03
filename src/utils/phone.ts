/** Digits of a typed phone number, without a leading country code 1. */
export function phoneDigits(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
}

/** "+14165550123", the format the server stores. */
export function toE164(value: string) {
  return `+1${phoneDigits(value)}`;
}

/** "4165550123" -> "416 555 0123" */
export function formatPhone(phone: unknown) {
  const digits = phoneDigits(phone === null || phone === undefined ? '' : String(phone).trim());
  return digits.length === 10 ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : digits;
}
