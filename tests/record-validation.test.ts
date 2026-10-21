import { describe, expect, it } from "vitest";
import type { GeneratedField } from "@prisma/client";
import { validateRecordData } from "@/lib/validation/records";

function field(partial: Partial<GeneratedField> & { name: string; type: GeneratedField["type"] }): GeneratedField {
  return {
    id: `f_${partial.name}`,
    tableId: "t1",
    organizationId: "o1",
    label: partial.name,
    position: 0,
    required: false,
    unique: false,
    isTitle: false,
    searchable: true,
    sortable: true,
    options: [],
    helpText: null,
    ...partial,
  } as GeneratedField;
}

describe("validateRecordData (server-side, app.txt §13)", () => {
  it("rejects missing required values", () => {
    const { data, errors } = validateRecordData(
      [field({ name: "name", type: "TEXT", required: true })],
      {}
    );
    expect(errors["name"]).toMatch(/required/i);
    expect(data["name"]).toBeNull();
  });

  it("validates email format and normalizes case", () => {
    const fields = [field({ name: "email", type: "EMAIL" })];
    expect(
      validateRecordData(fields, { email: "not-an-email" }).errors["email"]
    ).toMatch(/email/i);
    const good = validateRecordData(fields, { email: "Amy@Example.COM" });
    expect(good.errors).toEqual({});
    expect(good.data["email"]).toBe("amy@example.com");
  });

  it("constrains enum values to known options (case-insensitive)", () => {
    const fields = [field({ name: "status", type: "ENUM", options: ["Active", "Churned"] })];
    expect(
      validateRecordData(fields, { status: "Mystery" }).errors["status"]
    ).toMatch(/one of/i);
    const good = validateRecordData(fields, { status: "active" });
    expect(good.errors).toEqual({});
    expect(good.data["status"]).toBe("Active");
  });

  it("validates phone numbers", () => {
    const fields = [field({ name: "phone", type: "PHONE" })];
    expect(validateRecordData(fields, { phone: "abc" }).errors["phone"]).toMatch(/phone/i);
    expect(validateRecordData(fields, { phone: "+1 (555) 123-4567" }).errors).toEqual({});
  });

  it("coerces currency strings to numbers and rejects junk", () => {
    const fields = [field({ name: "revenue", type: "CURRENCY" })];
    const good = validateRecordData(fields, { revenue: "$12,400" });
    expect(good.errors).toEqual({});
    expect(good.data["revenue"]).toBe(12400);
    expect(
      validateRecordData(fields, { revenue: "lots" }).errors["revenue"]
    ).toMatch(/number/i);
  });

  it("accepts empty optional values as null", () => {
    const { data, errors } = validateRecordData(
      [field({ name: "notes", type: "LONG_TEXT" })],
      { notes: "" }
    );
    expect(errors).toEqual({});
    expect(data["notes"]).toBeNull();
  });
});
