import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { answerAssistantQuestion } from "@/lib/ai/assistant";

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  // Rate-limit key: per-USER when signed in (IP rotation must not buy a
  // fresh LLM quota), per-IP only for anonymous mascot traffic. Buckets are
  // still in-memory per serverless instance — a shared store (Upstash) is
  // the known follow-up for a global ceiling.
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const rlKey = userId ? `assistant:u:${userId}` : `assistant:ip:${ip}`;
  if (!rateLimit(rlKey, { limit: 10, windowMs: 60_000 })) {
    return NextResponse.json(
      { error: "Too many questions — please wait a minute and try again." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Please send your question as JSON." }, { status: 400 });
  }
  const message =
    typeof (body as { message?: unknown })?.message === "string"
      ? ((body as { message: string }).message ?? "").trim()
      : "";
  if (!message) {
    return NextResponse.json({ error: "Please ask a question first." }, { status: 400 });
  }
  if (message.length > 500) {
    return NextResponse.json(
      { error: "Please keep questions under 500 characters." },
      { status: 400 }
    );
  }

  // The LLM call costs quota — only signed-in users get it. Anonymous
  // visitors (the public mascot) get the free deterministic keyword brain.
  const reply = await answerAssistantQuestion(message, { useAi: Boolean(userId) });
  return NextResponse.json({ reply });
}
