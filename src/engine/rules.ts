import type { BrandProfile, EvaluationFinding, TextSpan } from "@/types";
import { detectSpans } from "./spans";

export interface RuleCheck { pass: boolean; score: number; spans: TextSpan[]; findings: EvaluationFinding[]; }

export function checkRules(text: string, profile?: Partial<BrandProfile>): RuleCheck {
  const spans = detectSpans(text, {
    bannedWords: profile?.bannedWords ?? profile?.banned_words,
    hardRules: profile?.hardRules ?? profile?.hard_rules
  });
  const findings = spans.map((span) => ({ type: span.category, message: span.rule, spans: [span] }));
  const high = spans.filter((s) => s.severity === "high").length;
  const medium = spans.filter((s) => s.severity === "medium").length;
  return { pass: high === 0, score: Math.max(0, 100 - high * 25 - medium * 10 - spans.filter((s) => s.category === "ai-slop").length * 2), spans, findings };
}
