/**
 * Totally-free LLM providers (no credit card) — curated from
 * open-free-llm-api/awesome-freellm-apis.
 *
 * All entries below expose an OpenAI-compatible `POST {baseUrl}/chat/completions`
 * endpoint, so they work with the existing `OpenAICompatibleProvider` with
 * zero code changes — only env vars.
 *
 * Priority order = best default first (speed + free quota + reliability).
 */

export interface FreeProviderPreset {
  id: string;
  label: string;
  baseUrl: string;
  defaultModel: string;
  signupUrl: string;
  requiresCard: false;
  notes: string;
}

export const FREE_PROVIDERS: FreeProviderPreset[] = [
  {
    id: "groq",
    label: "Groq (recommended)",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "qwen/qwen3.8-27b",
    signupUrl: "https://console.groq.com/keys",
    requiresCard: false,
    notes: "No card. ~30 RPM free. Verified live (kimi-k2 not on all accounts).",
  },
  {
    id: "cerebras",
    label: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    defaultModel: "llama3.1-70b",
    signupUrl: "https://cloud.cerebras.ai/",
    requiresCard: false,
    notes: "No card. Very fast inference, generous free tier.",
  },
  {
    id: "mistral",
    label: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "open-mistral-7b",
    signupUrl: "https://console.mistral.ai/api-keys",
    requiresCard: false,
    notes: "No card. OpenAI-compatible. Good EU option.",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    defaultModel: "gemini-2.0-flash",
    signupUrl: "https://aistudio.google.com/app/apikey",
    requiresCard: false,
    notes: "No card. 15 RPM / 1,500 RPD free. Use OpenAI-compat endpoint.",
  },
  {
    id: "huggingface",
    label: "Hugging Face",
    baseUrl: "https://router.huggingface.co/v1",
    defaultModel: "meta-llama/Meta-Llama-3.1-8B-Instruct",
    signupUrl: "https://huggingface.co/settings/tokens",
    requiresCard: false,
    notes: "No card. Free credits included. Many open models.",
  },
  {
    id: "llm7",
    label: "LLM7.io",
    baseUrl: "https://api.llm7.io/v1",
    defaultModel: "gpt-oss-20b",
    signupUrl: "https://token.llm7.io",
    requiresCard: false,
    notes: "No card. ~60 RPM free. Simplest signup.",
  },
];

export function getPreset(id?: string | null): FreeProviderPreset | undefined {
  if (!id) return undefined;
  const clean = id.trim().toLowerCase();
  return FREE_PROVIDERS.find((p) => p.id === clean);
}

/**
 * Resolve effective { baseUrl, model } from env + optional AI_PROVIDER preset.
 * Explicit AI_BASE_URL / AI_MODEL always win over the preset.
 */
export function resolveProviderConfig(env: {
  provider?: string;
  baseUrl?: string;
  model?: string;
}): { baseUrl: string; model: string; preset?: FreeProviderPreset } {
  const preset = getPreset(env.provider);
  const baseUrl =
    env.baseUrl?.trim() || preset?.baseUrl || "https://api.openai.com/v1";
  const model =
    env.model?.trim() || preset?.defaultModel || "gpt-4o-mini";
  return { baseUrl, model, preset };
}
