import { NextResponse } from "next/server";
import { detectSpans, routeContent } from "@/engine";
import { getProfile, DEFAULT_YET_PROFILE } from "@/lib/storage";
import type { Channel } from "@/types";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await request.json() as { text?: string; content?: string; channel?: Channel; profileId?: string };
    const text = body.text ?? body.content;
    if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
    const profile = (body.profileId ? getProfile(body.profileId) : undefined) ?? DEFAULT_YET_PROFILE;
    const spans = detectSpans(text, { bannedWords: profile.bannedWords });
    let rewritten = text;
    for (const span of [...spans].sort((a, b) => b.start - a.start)) rewritten = `${rewritten.slice(0, span.start)}${replacement(span.text, span.category)}${rewritten.slice(span.end)}`;
    return NextResponse.json({ original: text, rewritten, spans, routed: routeContent(rewritten, body.channel ?? "generic") });
  } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
}
function replacement(value: string, category: string) { if (category === "ai-slop") return value.split(/\s+/).length > 1 ? "make it specific" : "useful"; if (category === "banned-word") return ""; return "[verify this claim]"; }
