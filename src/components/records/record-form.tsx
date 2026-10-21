"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { GeneratedField } from "@prisma/client";
import { createRecordAction, updateRecordAction } from "@/actions/records";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";

export interface RecordFormProps {
  tableId: string;
  fields: GeneratedField[];
  initial?: Record<string, unknown>;
  recordId?: string;
  redirectHref: string;
  onCancelHref?: string;
  /** Submit button text override, e.g. "Create Customer". */
  submitLabel?: string;
  /** field.id → options for RELATION fields */
  relationOptions?: Record<string, { value: string; label: string }[]>;
}

function defaultValue(field: GeneratedField): unknown {
  if (field.type === "BOOLEAN") return false;
  return "";
}

export function RecordForm({
  tableId,
  fields,
  initial,
  recordId,
  redirectHref,
  onCancelHref,
  submitLabel,
  relationOptions,
}: RecordFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const base: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = initial ? initial[field.name] : defaultValue(field);
      if (field.type === "DATE" && typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
        base[field.name] = raw.slice(0, 10);
      } else if (field.type === "DATETIME" && typeof raw === "string" && raw.includes("T")) {
        base[field.name] = raw.slice(0, 16);
      } else if (raw === null || raw === undefined) {
        base[field.name] = defaultValue(field);
      } else {
        base[field.name] = raw;
      }
    }
    return base;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function set(field: GeneratedField, value: unknown) {
    setValues((prev) => ({ ...prev, [field.name]: value }));
    setErrors((prev) => ({ ...prev, [field.name]: "" }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    for (const field of fields) {
      const value = values[field.name];
      const empty = value === null || value === undefined || String(value).trim() === "";
      if (field.required && field.type !== "BOOLEAN" && empty) {
        next[field.name] = `${field.label} is required.`;
        continue;
      }
      if (empty || field.type === "BOOLEAN") continue;
      const text = String(value);
      if (field.type === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(text)) {
        next[field.name] = "Enter a valid email address.";
      }
      if (["NUMBER", "CURRENCY", "PERCENT"].includes(field.type) && !Number.isFinite(Number(text))) {
        next[field.name] = "Enter a valid number.";
      }
      if (field.type === "URL" && !/^https?:\/\/\S+$/i.test(text)) {
        next[field.name] = "Enter a URL starting with http(s)://";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      const value = values[field.name];
      if (field.type === "BOOLEAN") {
        payload[field.name] = value === true || value === "true";
        continue;
      }
      if (value === null || value === undefined || String(value).trim() === "") {
        payload[field.name] = null;
        continue;
      }
      if (["NUMBER", "CURRENCY", "PERCENT"].includes(field.type)) {
        payload[field.name] = Number(value);
      } else {
        payload[field.name] = String(value).trim();
      }
    }

    const result = recordId
      ? await updateRecordAction(recordId, payload)
      : await createRecordAction(tableId, payload);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(recordId ? "Record updated" : "Record created");
    router.push(redirectHref);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <FormField
            key={field.name}
            label={field.label}
            htmlFor={field.name}
            required={field.required}
            error={errors[field.name] || null}
            hint={field.helpText ?? undefined}
            className={field.type === "LONG_TEXT" || field.type === "RELATION" ? "sm:col-span-2" : undefined}
          >
            {field.type === "LONG_TEXT" ? (
              <Textarea
                id={field.name}
                rows={3}
                value={String(values[field.name] ?? "")}
                onChange={(e) => set(field, e.target.value)}
              />
            ) : field.type === "BOOLEAN" ? (
              <label className="flex h-9 items-center gap-2 text-sm text-[#111111]">
                <Checkbox
                  checked={values[field.name] === true}
                  onChange={(e) => set(field, e.target.checked)}
                />
                {field.label}
              </label>
            ) : field.type === "ENUM" || (field.type === "RELATION" && relationOptions?.[field.id]) ? (
              <select
                id={field.name}
                value={String(values[field.name] ?? "")}
                onChange={(e) => set(field, e.target.value)}
                className="flex h-9 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111111] focus:border-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]/10"
              >
                <option value="">Select…</option>
                {field.type === "RELATION"
                  ? (relationOptions?.[field.id] ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))
                  : (field.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
              </select>
            ) : (
              <Input
                id={field.name}
                type={
                  field.type === "EMAIL"
                    ? "email"
                    : field.type === "PHONE"
                      ? "tel"
                      : field.type === "URL"
                      ? "url"
                      : field.type === "DATE"
                        ? "date"
                        : field.type === "DATETIME"
                          ? "datetime-local"
                          : ["NUMBER", "CURRENCY", "PERCENT"].includes(field.type)
                            ? "number"
                            : "text"
                }
                step={field.type === "NUMBER" || field.type === "PERCENT" ? "any" : undefined}
                value={String(values[field.name] ?? "")}
                onChange={(e) => set(field, e.target.value)}
                placeholder={field.helpText ?? undefined}
              />
            )}
          </FormField>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" loading={loading}>
          {submitLabel ?? (recordId ? "Save changes" : "Create record")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(onCancelHref ?? redirectHref)}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
