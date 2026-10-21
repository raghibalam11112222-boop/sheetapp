import { z } from "zod";

export const FIELD_TYPES = [
  "TEXT",
  "LONG_TEXT",
  "NUMBER",
  "CURRENCY",
  "PERCENT",
  "DATE",
  "DATETIME",
  "BOOLEAN",
  "ENUM",
  "EMAIL",
  "PHONE",
  "URL",
  "RELATION",
  "IDENTIFIER",
] as const;

export const fieldTypeSchema = z.enum(FIELD_TYPES);
export type SchemaFieldType = z.infer<typeof fieldTypeSchema>;

export const fieldSuggestionSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1).max(80),
  type: fieldTypeSchema,
  required: z.boolean(),
  unique: z.boolean(),
  isTitle: z.boolean().default(false),
  options: z.array(z.string().max(80)).max(30).optional(),
  sourceColumnIndex: z.number().int().min(0).max(500),
  helpText: z.string().max(200).optional(),
});

export const tableSuggestionSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1).max(60),
  singularLabel: z.string().min(1).max(60),
  sourceSheet: z.string().min(1).max(80),
  description: z.string().max(200).optional(),
  fields: z.array(fieldSuggestionSchema).min(1).max(300),
  recordCount: z.number().int().min(0),
});

export const schemaRelationshipSchema = z.object({
  fromTableKey: z.string().min(1),
  fromFieldKey: z.string().min(1),
  toTableKey: z.string().min(1),
  confidence: z.number().min(0).max(1),
  label: z.string().max(80).optional(),
});

export const schemaSuggestionSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(300).optional(),
  tables: z.array(tableSuggestionSchema).min(1).max(30),
  relationships: z.array(schemaRelationshipSchema).max(50),
  rationale: z.string().max(500).optional(),
});

export type FieldSuggestion = z.infer<typeof fieldSuggestionSchema>;
export type TableSuggestion = z.infer<typeof tableSuggestionSchema>;
export type SchemaRelationship = z.infer<typeof schemaRelationshipSchema>;
export type SchemaSuggestion = z.infer<typeof schemaSuggestionSchema>;
