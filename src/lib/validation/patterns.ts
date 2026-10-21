/**
 * Shared validation patterns (single source of truth — do not duplicate
 * these expressions across analysis, import and record validation).
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export const PHONE_RE = /^\+?[0-9][0-9\s().\-]{5,20}$/;

/** Minimum digits for a value to count as a phone number. */
export const PHONE_MIN_DIGITS = 7;
