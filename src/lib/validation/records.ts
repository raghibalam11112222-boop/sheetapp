import type { GeneratedField } from "@/generated/prisma/client";
import { coerceDate, coerceNumber } from "@/lib/generation/import";
import { EMAIL_RE, PHONE_RE } from "./patterns";

export type RecordInput = Record<string, unknown>;
export type FieldErrors = Record<string, string>;

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

/**
 * Validates and normalizes record input against the generated field metadata.
 * Used by both the client form (inline messages) and server actions
 * (authoritative check) — app.txt §13 requires client AND server validation.
 */
export function validateRecordData(
  fields: GeneratedField[],
  input: RecordInput,
  opts: { partial?: boolean } = {}
): { data: Record<string, string | number | boolean | null>; errors: FieldErrors } {
  const data: Record<string, string | number | boolean | null> = {};
  const errors: FieldErrors = {};

  for (const field of fields) {
    const raw = input[field.name];
    const missing = isBlank(raw);

    if (missing) {
      if (field.required && !opts.partial) errors[field.name] = `${field.label} is required.`;
      data[field.name] = null;
      continue;
    }

    switch (field.type) {
      case "NUMBER":
      case "CURRENCY":
      case "PERCENT": {
        const n = coerceNumber(raw);
        if (n === null) errors[field.name] = `${field.label} must be a number.`;
        data[field.name] = n;
        break;
      }
      case "DATE":
      case "DATETIME": {
        const iso = coerceDate(raw);
        if (!iso) errors[field.name] = `${field.label} must be a valid date.`;
        data[field.name] = iso;
        break;
      }
      case "BOOLEAN": {
        if (typeof raw === "boolean") data[field.name] = raw;
        else data[field.name] = /^(true|yes|y|1)$/i.test(String(raw).trim());
        break;
      }
      case "EMAIL": {
        const text = String(raw).trim();
        if (!EMAIL_RE.test(text)) errors[field.name] = `${field.label} must be a valid email address.`;
        data[field.name] = text.toLowerCase();
        break;
      }
      case "ENUM": {
        const text = String(raw).trim();
        const options = field.options ?? [];
        const match = options.find((o) => o.toLowerCase() === text.toLowerCase());
        if (options.length && !match)
          errors[field.name] = `${field.label} must be one of: ${options.join(", ")}.`;
        else data[field.name] = match ?? text;
        break;
      }
      case "PHONE": {
        const text = String(raw).trim();
        if (!PHONE_RE.test(text))
          errors[field.name] = `${field.label} must be a valid phone number.`;
        data[field.name] = text;
        break;
      }
      case "LONG_TEXT": {
        const text = String(raw).slice(0, 5000);
        data[field.name] = text;
        break;
      }
      default: {
        data[field.name] = String(raw).trim().slice(0, 500);
      }
    }

    if (field.required && data[field.name] === null && !errors[field.name]) {
      errors[field.name] = `${field.label} is required.`;
    }
  }

  return { data, errors };
}
