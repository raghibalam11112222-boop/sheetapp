import { NextResponse } from "next/server";

// better-auth endpoint removed — Clerk handles auth. Keep route to avoid 404s
// from stale clients.
export async function GET() {
  return NextResponse.json({ error: "Auth moved to Clerk." }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: "Auth moved to Clerk." }, { status: 410 });
}
