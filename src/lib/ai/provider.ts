import type { SpreadsheetAnalysis, SheetAnalysis } from "@/lib/spreadsheet/types";
import {
  schemaSuggestionSchema,
  type SchemaRelationship,
  type SchemaSuggestion,
} from "./types";
import { buildDeterministicSchema } from "./deterministic";
import { resolveProviderConfig } from "./free-providers";

export interface AIProvider {
  readonly name: string;
  analyzeSchema(input: AIProviderInput): Promise<SchemaSuggestion>;
  suggestRelationships(input: AIProviderInput): Promise<SchemaRelationship[]>;
  generateMetadata(input: AIProviderInput): Promise<{ name: string; description: string }>;
}

export interface AIProviderInput {
  analysis: SpreadsheetAnalysis;
  /** Optional user hint, e.g. "What do you use this spreadsheet for?" answer. */
  hint?: string;
}

// ---------------------------------------------------------------------------
// Deterministic provider (always available, no network, no key required)
// ---------------------------------------------------------------------------

export class DeterministicProvider implements AIProvider {
  readonly name = "deterministic";

  async analyzeSchema({ analysis }: AIProviderInput): Promise<SchemaSuggestion> {
    return buildDeterministicSchema(analysis);
  }

  async suggestRelationships({ analysis }: AIProviderInput): Promise<SchemaRelationship[]> {
    return buildDeterministicSchema(analysis).relationships;
  }

  async generateMetadata({ analysis }: AIProviderInput) {
    const schema = buildDeterministicSchema(analysis);
    return { name: schema.name, description: schema.description ?? "" };
  }
}

// ---------------------------------------------------------------------------
// Compact, privacy-preserving analysis payload for prompts (app.txt §7)
// ---------------------------------------------------------------------------

const MAX_PROMPT_COLUMNS = 60;
const MAX_SAMPLES = 3;
const MAX_ENUM_VALUES = 10;

function compactSheet(sheet: SheetAnalysis) {
  return {
    name: sheet.name,
    rows: sheet.rowCount,
    columns: sheet.columns.slice(0, MAX_PROMPT_COLUMNS).map((c) => ({
      index: c.index,
      name: c.name,
      type: c.type,
      requiredish: c.emptyRatio === 0,
      unique: c.uniqueCount,
      samples: c.sampleValues.slice(0, MAX_SAMPLES),
      enumValues: c.enumValues?.slice(0, MAX_ENUM_VALUES),
      identifier: c.likelyIdentifier,
      status: c.possibleStatus,
      foreignKey: c.foreignKey
        ? `${c.foreignKey.targetSheet}.${c.foreignKey.targetColumn}`
        : undefined,
    })),
  };
}

export function buildPromptPayload(input: AIProviderInput) {
  const { analysis, hint } = input;
  return {
    file: analysis.fileName,
    purpose: hint,
    sheets: analysis.sheets.map(compactSheet),
    detectedRelationships: analysis.relationships.slice(0, 10).map((r) => ({
      from: `${r.fromSheet}.${r.fromColumn}`,
      to: `${r.toSheet}.${r.toColumn}`,
      confidence: r.confidence,
    })),
    dataQuality: {
      duplicates: analysis.duplicates.length,
      brokenFormulas: analysis.health
        .filter((h) => h.category === "broken_formulas")
        .reduce((sum, h) => sum + h.count, 0),
    },
  };
}

// ---------------------------------------------------------------------------
// Reconciliation: AI output may enhance but never remove deterministic facts
// ---------------------------------------------------------------------------

export function reconcileSuggestion(
  ai: SchemaSuggestion,
  baseline: SchemaSuggestion,
  analysis: SpreadsheetAnalysis
): SchemaSuggestion {
  const sheetNames = new Set(analysis.sheets.map((s) => s.name));
  const columnCounts = new Map(
    analysis.sheets.map((s) => [s.name, s.columnCount] as const)
  );

  const result: SchemaSuggestion = {
    name: ai.name?.trim() || baseline.name,
    description: ai.description?.trim() || baseline.description,
    tables: [],
    relationships: [],
    rationale: ai.rationale || baseline.rationale,
  };

  for (const baseTable of baseline.tables) {
    const aiTable = ai.tables.find(
      (t) => t.sourceSheet === baseTable.sourceSheet && sheetNames.has(t.sourceSheet)
    );
    const maxColumns = columnCounts.get(baseTable.sourceSheet) ?? 0;

    if (!aiTable) {
      result.tables.push(baseTable);
      continue;
    }

    const aiFieldsByIndex = new Map(
      aiTable.fields
        .filter((f) => f.sourceColumnIndex >= 0 && f.sourceColumnIndex < maxColumns)
        .map((f) => [f.sourceColumnIndex, f] as const)
    );

    const seenKeys = new Set<string>();
    const fields = baseTable.fields.map((baseField) => {
      const aiField = aiFieldsByIndex.get(baseField.sourceColumnIndex);
      if (!aiField) return baseField;
      const key = seenKeys.has(baseField.key) ? `${baseField.key}_x` : baseField.key;
      seenKeys.add(key);
      return {
        ...baseField,
        key,
        label: aiField.label?.trim() || baseField.label,
        isTitle: Boolean(aiField.isTitle) || baseField.isTitle,
        helpText: aiField.helpText || baseField.helpText,
      };
    });

    // Ensure a single title field survives reconciliation.
    if (!fields.some((f) => f.isTitle) && fields.length) {
      fields[0] = { ...fields[0], isTitle: true };
    }

    result.tables.push({
      ...baseTable,
      label: aiTable.label?.trim() || baseTable.label,
      singularLabel: aiTable.singularLabel?.trim() || baseTable.singularLabel,
      description: aiTable.description || baseTable.description,
      fields: fields.map((f, i) => {
        const titles = fields.filter((x) => x.isTitle);
        if (titles.length > 1 && f.isTitle && i !== fields.findIndex((x) => x.isTitle)) {
          return { ...f, isTitle: false };
        }
        return f;
      }),
    });
  }

  const validTableKeys = new Set(result.tables.map((t) => t.key));
  const validFieldKeys = new Set(
    result.tables.flatMap((t) => t.fields.map((f) => `${t.key}.${f.key}`))
  );

  const mergeRelationships = (list: SchemaRelationship[]) =>
    list.filter(
      (r) =>
        validTableKeys.has(r.fromTableKey) &&
        validTableKeys.has(r.toTableKey) &&
        validFieldKeys.has(`${r.fromTableKey}.${r.fromFieldKey}`)
    );

  const aiRelationships = mergeRelationships(ai.relationships ?? []);
  const baseRelationships = mergeRelationships(baseline.relationships);

  for (const rel of aiRelationships) {
    const duplicate = baseRelationships.some(
      (b) => b.fromTableKey === rel.fromTableKey && b.fromFieldKey === rel.fromFieldKey
    );
    if (!duplicate) result.relationships.push(rel);
  }
  result.relationships.push(...baseRelationships);

  return result;
}

// ---------------------------------------------------------------------------
// Optional OpenAI-compatible provider
// ---------------------------------------------------------------------------

interface OpenAICfg {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const SYSTEM_PROMPT = `You are a business data modeler for SheetApp, which turns spreadsheets into internal business apps.
Analyze the provided spreadsheet metadata and return ONLY minified JSON with this exact shape:
{"name":"app name (max 60 chars)","description":"one sentence (max 300 chars)","tables":[{"key":"snake_case","label":"Table Label","singularLabel":"Singular","sourceSheet":"exact sheet name","description":"optional","fields":[{"key":"snake_case","label":"Field Label","type":"TEXT|LONG_TEXT|NUMBER|CURRENCY|PERCENT|DATE|DATETIME|BOOLEAN|ENUM|EMAIL|PHONE|URL|IDENTIFIER","required":true/false,"unique":true/false,"isTitle":true/false,"options":["only for ENUM"],"sourceColumnIndex":0,"helpText":"optional"}],"recordCount":0}],"relationships":[{"fromTableKey":"...","fromFieldKey":"...","toTableKey":"...","confidence":0.0,"label":"optional"}],"rationale":"short explanation"}
Rules:
- sourceSheet must match the input exactly; sourceColumnIndex must reference a provided column index.
- Keep EVERY column from the input as exactly one field, in order. Never invent or drop columns.
- isTitle: exactly one field per table is true (the human-readable identifier).
- Tables are business entities; labels should be professional (e.g. Customers, Orders).
- Relationships only when the data strongly supports them.`;

function extractJson(text: string): unknown {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in AI response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly name = "ai";

  constructor(
    private cfg: OpenAICfg,
    private fallback: DeterministicProvider = new DeterministicProvider()
  ) {}

  async chat(
    system: string,
    user: string,
    opts?: { timeoutMs?: number; maxTokens?: number }
  ): Promise<string> {
    return this.complete(system, user, opts?.timeoutMs ?? 20_000, opts?.maxTokens);
  }

  private async complete(
    system: string,
    user: string,
    // Kept short on purpose: the deterministic fallback is always available,
    // so a slow provider must not stall the review page (2 attempts max).
    timeoutMs = 15_000,
    maxTokens?: number
  ): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: this.cfg.model,
          temperature: 0.1,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        // Include a snippet of the error body — status alone (413? 429?)
        // doesn't say whether it's size, quota, or model availability.
        const body = await res.text().catch(() => "");
        throw new Error(
          `AI provider responded with ${res.status}${body ? `: ${body.slice(0, 300)}` : ""}`
        );
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("AI provider returned an empty response");
      return content;
    } finally {
      clearTimeout(timer);
    }
  }

  async analyzeSchema(input: AIProviderInput): Promise<SchemaSuggestion> {
    const baseline = buildDeterministicSchema(input.analysis);
    const payload = JSON.stringify(buildPromptPayload(input));
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const user =
          attempt === 0
            ? `Spreadsheet metadata:\n${payload}`
            : `Your previous answer was invalid: ${String(lastError)}.\nFix it and return valid JSON for this metadata:\n${payload}`;
        // Explicit output cap: without max_tokens Groq reserves a giant
        // implicit budget, pushing the request over the 8K TPM ceiling
        // (HTTP 413) even for small prompts. 4000 covers typical schemas;
        // giant sheets fall back to deterministic (which holds all columns).
        const text = await this.complete(SYSTEM_PROMPT, user, 15_000, 4_000);
        const parsed = schemaSuggestionSchema.parse(extractJson(text));
        return reconcileSuggestion(parsed, baseline, input.analysis);
      } catch (err) {
        lastError = err instanceof Error ? err.message : err;
        // Rate-limited (Groq free tier): back off before the repair attempt
        // instead of hammering the quota window a second time.
        if (attempt === 0 && String(lastError).includes("429")) {
          await new Promise((resolve) => setTimeout(resolve, 8000));
        }
      }
    }
    console.warn("[SheetApp] AI schema generation failed, using deterministic schema:", lastError);
    // Quota signal for ops: rate/size rejections are worth alerting on before
    // users notice degraded (non-AI) schemas. Fire-and-forget, never blocks.
    try {
      const msg = String(lastError ?? "");
      if (msg.includes("429") || msg.includes("413")) {
        const { track } = await import("@/lib/analytics/track");
        await track("ai_quota_hit", { metadata: { error: msg.slice(0, 200) } });
      }
    } catch {
      // analytics must never break the fallback path
    }
    return baseline;
  }

  async suggestRelationships(input: AIProviderInput): Promise<SchemaRelationship[]> {
    try {
      const schema = await this.analyzeSchema(input);
      return schema.relationships;
    } catch {
      return this.fallback.suggestRelationships(input);
    }
  }

  async generateMetadata(input: AIProviderInput) {
    try {
      const payload = JSON.stringify({
        file: input.analysis.fileName,
        sheets: input.analysis.sheets.map((s) => ({
          name: s.name,
          columns: s.columns.slice(0, 15).map((c) => c.name),
        })),
        purpose: input.hint,
      });
      const text = await this.complete(
        "Return ONLY JSON {\"name\":\"app name max 60 chars\",\"description\":\"one sentence max 300 chars\"} for an internal business app generated from this spreadsheet.",
        payload,
        12_000,
        300
      );
      const parsed = extractJson(text) as { name?: string; description?: string };
      if (!parsed.name || typeof parsed.name !== "string") throw new Error("missing name");
      return {
        name: parsed.name.trim().slice(0, 60),
        description: String(parsed.description ?? "").trim().slice(0, 300),
      };
    } catch {
      return this.fallback.generateMetadata(input);
    }
  }
}

// ---------------------------------------------------------------------------
// Provider selection
// ---------------------------------------------------------------------------

export function getAIProvider(): AIProvider {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (apiKey) {
    const { baseUrl, model } = resolveProviderConfig({
      provider: process.env.AI_PROVIDER,
      baseUrl: process.env.AI_BASE_URL,
      model: process.env.AI_MODEL,
    });
    return new OpenAICompatibleProvider({ apiKey, baseUrl, model });
  }
  return new DeterministicProvider();
}
