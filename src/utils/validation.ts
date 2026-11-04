// Rules shared by the onboarding forms. Same patterns as the web client.
export const LETTERS_AND_SPACES = /^[a-zA-Z\s]+$/;
export const EMAIL = /^[\w.-]+@[\w.-]+\.\w+$/;
export const WEBSITE = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i;
export const CANADIAN_POSTAL_CODE = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i;
// Ten digits after the +1 country code; the area code can't start with 0 or 1.
export const CANADIAN_PHONE = /^[2-9]\d{9}$/;

/** True for an empty or whitespace-only value. */
export const isBlank = (value: string | null | undefined) => !value || value.trim() === '';
