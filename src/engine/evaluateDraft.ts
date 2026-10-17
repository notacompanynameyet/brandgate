import type { BrandProfile } from "@/types";
import { checkRules } from "./rules";
import { scoreHook } from "./scoring";

export interface DraftEvaluation {
  score: number;
  overall_score: number;
  verdict: "APPROVED" | "HELD_FOR_REVIEW" | "REJECTED";
  rules: ReturnType<typeof checkRules>;
  hook: ReturnType<typeof scoreHook>;
  slop_penalty_count: number;
  key_reason: string;
  reasons: string[];
}

/** The shared deterministic BrandGate decision used by API evaluation and tournaments. */
export function evaluateDraft(text: string, profile: Partial<BrandProfile>): DraftEvaluation {
  const rules = checkRules(text, profile);
  const hook = scoreHook(text);
  const slopSpans = rules.spans.filter((span) => span.category === "ai-slop");
  const manufacturedSpans = rules.spans.filter((span) => span.category === "manufactured-claim");
  const hardSpans = rules.spans.filter((span) => span.category === "hard-rule");
  const slopPenalty = slopSpans.length * 12;
  const manufacturedPenalty = manufacturedSpans.length * 22;
  const hardPenalty = hardSpans.length * 28;
  const cleanHookBonus = Math.round((hook.total / 40) * 10);
  const score = slopPenalty + manufacturedPenalty + hardPenalty === 0
    ? Math.max(82, Math.min(96, 86 + cleanHookBonus))
    : Math.max(0, Math.min(100, 100 - slopPenalty - manufacturedPenalty - hardPenalty + Math.round(hook.total / 40 * 8)));
  const roundedScore = Math.round(score);
  const reasons = rules.findings.map((finding) => finding.message);
  if (reasons.length === 0) reasons.push(...hook.reasons);
  const key_reason = reasons[0] ?? "Clear, specific copy aligns with the active brand memory.";
  const minPassScore = profile.min_pass_score ?? profile.minPassScore ?? 0.82;
  const verdict = roundedScore >= Math.round(minPassScore * 100) && hardSpans.length === 0 && manufacturedSpans.length === 0
    ? "APPROVED"
    : roundedScore < 50 || hardSpans.length > 0 || manufacturedSpans.length > 0
      ? "REJECTED"
      : "HELD_FOR_REVIEW";
  return { score: roundedScore, overall_score: roundedScore / 100, verdict, rules, hook, slop_penalty_count: slopSpans.length, key_reason, reasons };
}
