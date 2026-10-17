import { NextResponse } from "next/server";
import { checkRules, createBrandReceipt, evaluateWithJEV, routeContent, routeDetails, scoreHook } from "@/engine";
import { brandFromProfile, deliverWebhook, getProfile, saveEvaluation, DEFAULT_YET_PROFILE } from "@/lib/storage";
import type { Channel, Evaluation } from "@/types";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const startedAt = performance.now();
    const body = await request.json() as { text?: string; draft?: string; content?: string; copy?: string; channel?: Channel; target_channel?: Channel; profileId?: string; brand_profile_id?: string; profile?: Parameters<typeof checkRules>[1]; media_count?: number; async?: boolean };
    const text = body.draft ?? body.text ?? body.content ?? body.copy;
    if (!text || typeof text !== "string") return NextResponse.json({ error: "text is required" }, { status: 400 });
    const profileId = body.brand_profile_id ?? body.profileId;
    const profile = (profileId ? getProfile(profileId) : undefined) ?? DEFAULT_YET_PROFILE;
    const channel = body.target_channel ?? body.channel ?? "generic";
    const rules = checkRules(text, body.profile ?? profile);
    const hook = scoreHook(text);
    const decisionsEvaluated = 38 + rules.spans.length;
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const latencyBadge = `${decisionsEvaluated} decisions evaluated in ${latencyMs}ms`;
    const receipt = createBrandReceipt(text, channel, profile.id, { latency_badge: latencyBadge, decisions_evaluated: decisionsEvaluated });
    const routed = routeContent(text, channel);
    const channelRouting = routeDetails(text, channel, body.media_count ?? 0);
    const provider = await evaluateWithJEV(text, profile);
    const slopSpans = rules.spans.filter((span) => span.category === "ai-slop");
    const slopScore = Math.min(100, slopSpans.reduce((sum, span) => sum + (span.severity === "high" ? 18 : 12), 0) + Math.min(30, Math.max(0, (text.match(/—/g) ?? []).length - 1) * 5));
    const hookScore = Math.round((hook.total / 40) * 100);
    const overallScore = Math.max(0, Math.min(1, (provider.score / 100) * 0.35 + (rules.score / 100) * 0.4 + (hook.total / 40) * 0.25));
    const configuredRules = [
      ...((profile.banned_words ?? profile.bannedWords).map((rule) => ({ rule, category: "banned-word" as const }))),
      ...((profile.hard_rules ?? profile.hardRules).map((rule) => ({ rule, category: "hard-rule" as const }))),
      ...profile.manufacturedClaimPatterns.map((rule) => ({ rule, category: "manufactured-claim" as const }))
    ];
    const ruleResults = configuredRules.map(({ rule, category }) => {
      const matches = rules.spans.filter((span) => span.category === category && (span.rule.toLowerCase().includes(rule.toLowerCase()) || category !== "banned-word"));
      return { rule, passed: matches.length === 0, reason: matches.length === 0 ? "No matching violation found." : `Flagged ${matches.length} span${matches.length === 1 ? "" : "s"}.`, spans: matches };
    });
    const hasHardViolation = rules.spans.some((span) => span.severity === "high");
    const minPassScore = profile.min_pass_score ?? profile.minPassScore ?? 0.82;
    const verdict = hasHardViolation ? "REJECTED" : overallScore >= minPassScore && slopScore < 60 ? "APPROVED" : "HELD_FOR_REVIEW";
    const now = new Date().toISOString();
    const evaluation: Evaluation = { id: `eval_${randomUUID()}`, brandId: profile.id, status: "completed", score: provider.score, results: [{ criterionId: "rules", score: rules.score, feedback: rules.pass ? "Passes hard rules" : "Contains hard-rule violations" }, { criterionId: "hook", score: hook.total, feedback: hook.reasons.join("; ") }], createdAt: now, completedAt: now };
    saveEvaluation(evaluation);
    const result = { evaluation, brand: brandFromProfile(profile), provider, rules, hook, routed, receipt, pass: verdict === "APPROVED", verdict, overall_score: Number(overallScore.toFixed(3)), slop_score: slopScore, hook_score: hookScore, rule_results: ruleResults, channel_routing: channelRouting, receipt_hash: receipt.hash, latency_badge: latencyBadge, highlighted_spans: slopSpans };
    const webhook = await deliverWebhook("evaluation.completed", result);
    return NextResponse.json({ ...result, webhook }, { status: 200 });
  } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
}
