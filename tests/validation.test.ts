import { describe, expect, it } from "vitest";
import type { GeneratedField } from "@prisma/client";
import { validateRecordData } from "@/lib/validation/records";

function field(partial: Partial<GeneratedField>): GeneratedField {
  return {
    id: partial.id ?? "f1",
    tableId: "t1",
    organizationId: "o1",
    name: partial.name ?? "field",
    label: partial.label ?? "Field",
    type: partial.type ?? "TEXT",
    required: partial.required ?? false,
    unique: partial.unique ?? false,
    searchable: true,
    sortable: true,
    isTitle: partial.isTitle ?? false,
    position: 0,
    defaultValue: null,
    options: partial.options ?? [],
    helpText: null,
    constraints: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as GeneratedField;
}

const fields: GeneratedField[] = [
  field({ name: "name", label: "Name", type: "TEXT", required: true, isTitle: true }),
  field({ name: "email", label: "Email", type: "EMAIL" }),
  field({ name: "amount", label: "Amount", type: "CURRENCY" }),
  field({ name: "status", label: "Status", type: "ENUM", options: ["Active", "Lead"] }),
  field({ name: "active", label: "Active", type: "BOOLEAN" }),
  field({ name: "signed_up", label: "Signed Up", type: "DATE" }),
];

describe("validateRecordData", () => {
  it("passes a fully valid payload and normalizes values", () => {
    const { data, errors } = validateRecordData(fields, {
      name: "  Acme Corp  ",
      email: "Billing@Acme.COM",
      amount: "1200.5",
      status: "active",
      active: "yes",
      signed_up: "2026-01-15",
    });

    expect(errors).toEqual({});
    expect(data.name).toBe("Acme Corp");
    expect(data.email).toBe("billing@acme.com");
    expect(data.amount).toBe(1200.5);
    expect(data.status).toBe("Active");
    expect(data.active).toBe(true);
    expect(typeof data.signed_up).toBe("string");
  });

  it("reports required, email, number and enum errors", () => {
    const { errors } = validateRecordData(fields, {
      name: "",
      email: "not-an-email",
      amount: "abc",
      status: "Unknown",
    });

    expect(errors.name).toMatch(/required/i);
    expect(errors.email).toMatch(/email/i);
    expect(errors.amount).toMatch(/number/i);
    expect(errors.status).toMatch(/one of/i);
  });

  it("ignores missing required fields in partial mode", () => {
    const { data, errors } = validateRecordData(fields, {}, { partial: true });
    expect(errors).toEqual({});
    expect(data.name).toBeNull();
  });

  it("keeps unknown fields out of the output", () => {
    const { data } = validateRecordData(fields, {
      name: "Acme",
      hacker_field: "DROP TABLE",
    });
    expect("hacker_field" in data).toBe(false);
  });
});
