import { NextResponse } from "next/server";
import { evaluateDraft } from "@/engine";
import { DEFAULT_YET_PROFILE, getProfile } from "@/lib/storage";
import type { BrandProfile } from "@/types";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await request.json() as { candidates?: string[]; posts?: string[]; profileId?: string; brand_profile_id?: string; profile?: Partial<BrandProfile> };
    const candidates = body.candidates ?? body.posts;
    if (!Array.isArray(candidates) || candidates.length < 2 || candidates.length > 3 || candidates.some((text) => typeof text !== "string" || !text.trim())) return NextResponse.json({ error: "candidates must contain 2–3 non-empty posts" }, { status: 400 });
    const profile = body.profile ?? (body.brand_profile_id || body.profileId ? getProfile(body.brand_profile_id ?? body.profileId ?? "") : undefined) ?? DEFAULT_YET_PROFILE;
    const evaluated = candidates.map((text, index) => {
      const result = evaluateDraft(text, profile);
      return { index, text, score: result.score, overall_score: result.overall_score, verdict: result.verdict, slop_penalty_count: result.slop_penalty_count, key_reason: result.key_reason, reasons: result.reasons, hook: result.hook, rules: result.rules };
    });
    const ranking = evaluated.sort((a, b) => b.score - a.score || b.overall_score - a.overall_score || a.index - b.index);
    return NextResponse.json({ winner: ranking[0], ranking });
  } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
}
