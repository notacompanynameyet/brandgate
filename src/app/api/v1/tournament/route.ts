import { NextResponse } from "next/server";
import { scoreHook } from "@/engine";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await request.json() as { candidates?: string[]; posts?: string[] };
    const candidates = body.candidates ?? body.posts;
    if (!Array.isArray(candidates) || candidates.length < 2) return NextResponse.json({ error: "candidates must contain at least two posts" }, { status: 400 });
    const ranked = candidates.map((text, index) => ({ index, text, score: scoreHook(text) })).sort((a, b) => b.score.total - a.score.total || a.index - b.index);
    return NextResponse.json({ winner: ranked[0], ranking: ranked });
  } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
}
