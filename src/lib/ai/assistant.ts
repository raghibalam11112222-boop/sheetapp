import { getAIProvider, OpenAICompatibleProvider } from "./provider";

/**
 * Orby — the landing-page mascot's brain.
 *
 * Answers short product questions. When an AI key is configured the reply
 * comes from the OpenAI-compatible provider (tightly prompted, capped
 * length); otherwise a small keyword brain answers from fixed copy so the
 * chat always works. Never throws — callers always get a usable reply.
 */

const ASSISTANT_SYSTEM = `You are Orby, the friendly mascot of SheetApp (sheetapp — turns business spreadsheets into real internal apps).
Facts you must stick to:
- Upload an Excel (.xlsx, .xls) or CSV file; SheetApp analyzes it, shows the detected schema for review, then generates a dashboard, tables, forms, search, filters, roles, and export.
- Early access is free for the first 1,000 users. After that, simple weekly plans: Starter $9/week, Business $19/week, Pro $39/week. Never mention monthly prices.
- No coding needed. Data can be edited after import and exported to CSV/Excel anytime. Team roles: Admin, Manager, Member, Viewer.
- Google Sheets integration is planned, not available.
Rules: reply in at most 3 short sentences, plain text (no markdown, no lists). If the question is unrelated to SheetApp, say you only know about SheetApp and suggest uploading a spreadsheet. Never invent limits, customers, or timelines.`;

const FALLBACKS: { match: RegExp; reply: string }[] = [
  {
    match: /free|cost|price|pricing|pay|plan|much|trial/i,
    reply:
      "Early access is free for the first 1,000 users. After that, simple weekly plans start at $9 per week — no card required while it's free.",
  },
  {
    match: /upload|file|format|xlsx|csv|excel|sheet|import/i,
    reply:
      "You can upload Excel (.xlsx, .xls) or CSV files. I read the sheets, detect tables and types, and show everything for review before building your app.",
  },
  {
    match: /how|work|start|begin|generate|create|build/i,
    reply:
      "Three steps: upload your spreadsheet, review what I detected, then click Generate. You get a dashboard, tables, forms, search, and permissions.",
  },
  {
    match: /google/i,
    reply:
      "Google Sheets integration is planned but not available yet — Excel and CSV uploads work today.",
  },
  {
    match: /edit|change|update|delete|record/i,
    reply:
      "Yes — add, edit, and delete records any time, and rename fields or change types whenever you like. Your data stays editable and exportable.",
  },
  {
    match: /team|member|permission|role|share|employee/i,
    reply:
      "Invite teammates with Admin, Manager, Member, or Viewer roles. Roles are enforced on the server, not just hidden buttons.",
  },
  {
    match: /hi|hello|hey|yo\b|morning|afternoon/i,
    reply:
      "Hey! I'm Orby. Ask me about pricing, uploads, or how SheetApp turns spreadsheets into apps.",
  },
];

const FALLBACK_DEFAULT =
  "I mostly know about SheetApp — turning spreadsheets into internal apps, free early access, and weekly plans after 1,000 users. What would you like to know?";

function fallbackReply(message: string): string {
  const found = FALLBACKS.find((f) => f.match.test(message));
  return found ? found.reply : FALLBACK_DEFAULT;
}

export async function answerAssistantQuestion(
  message: string,
  opts: { useAi?: boolean } = {}
): Promise<string> {
  const clean = message.trim().slice(0, 500);
  if (!clean) return "Ask me something short — like whether it's free, or which files I accept.";
  // Fail closed: AI (and the API key quota it burns) only when the caller
  // explicitly opts in — the route does so only for signed-in users.
  const useAi = opts.useAi === true;
  const provider = getAIProvider();
  if (!useAi || provider.name === "deterministic" || !(provider instanceof OpenAICompatibleProvider))
    return fallbackReply(clean);
  try {
    const reply = await provider.chat(ASSISTANT_SYSTEM, clean, {
      timeoutMs: 20_000,
      maxTokens: 200,
    });
    const text = reply.trim().slice(0, 600);
    return text || fallbackReply(clean);
  } catch {
    return fallbackReply(clean);
  }
}
