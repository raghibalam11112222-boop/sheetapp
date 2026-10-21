import type { SpreadsheetAnalysis } from "@/lib/spreadsheet/types";
import type { SchemaSuggestion } from "./types";
import { buildDeterministicSchema } from "./deterministic";
import { getAIProvider } from "./provider";

export * from "./types";
export { buildDeterministicSchema } from "./deterministic";
export { getAIProvider, DeterministicProvider, OpenAICompatibleProvider } from "./provider";
export { FREE_PROVIDERS, resolveProviderConfig } from "./free-providers";

export interface GenerateSchemaResult {
  suggestion: SchemaSuggestion;
  provider: string;
}

/**
 * Generates the schema suggestion for an analyzed spreadsheet.
 * Deterministic analysis is always the baseline; an AI provider (when
 * configured) may enhance labels/metadata but can never break the result.
 */
export async function generateSchemaSuggestion(
  analysis: SpreadsheetAnalysis,
  hint?: string
): Promise<GenerateSchemaResult> {
  const baseline = buildDeterministicSchema(analysis);
  const provider = getAIProvider();

  if (provider.name === "deterministic") {
    return { suggestion: baseline, provider: provider.name };
  }

  try {
    const suggestion = await provider.analyzeSchema({ analysis, hint });
    return { suggestion, provider: provider.name };
  } catch (err) {
    console.warn("[SheetApp] AI provider failed, falling back to deterministic:", err);
    return { suggestion: baseline, provider: "deterministic-fallback" };
  }
}
