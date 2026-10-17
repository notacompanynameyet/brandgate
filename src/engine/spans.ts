import type { TextSpan } from "@/types";
import { AI_SLOP_TERMS, AI_SLOP_STRUCTURAL_PATTERNS, DEFAULT_BANNED_WORDS, HARD_RULE_PATTERNS, MANUFACTURED_CLAIM_PATTERNS } from "./lexicon";

function termRegex(term: string): RegExp {
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\\\s+")}\\b`, "gi");
}

function collect(text: string, regex: RegExp, category: TextSpan["category"], rule: string, severity: TextSpan["severity"]): TextSpan[] {
  const result: TextSpan[] = [];
  const re = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    result.push({ start: match.index, end: match.index + match[0].length, text: match[0], category, rule, severity });
    if (match[0].length === 0) re.lastIndex++;
  }
  return result;
}

function customRulePattern(rule: string): RegExp | undefined {
  const normalized = rule.toLowerCase();
  if (/hashtag/.test(normalized)) return /#\w+/gi;
  if (/outbound link|external link|url/.test(normalized)) return /https?:\/\/\S+/gi;
  if (/emoji/.test(normalized)) return /[\u{1F300}-\u{1FAFF}]/gu;
  const match = normalized.match(/\bno\s+(?:the\s+)?([a-z][a-z -]{2,40})/i);
  if (!match) return undefined;
  const phrase = match[1].replace(/\b(?:claims?|language|words?)\b/g, "").trim();
  return phrase ? termRegex(phrase) : undefined;
}

export function detectSpans(text: string, options: { bannedWords?: string[]; hardRules?: string[] } = {}): TextSpan[] {
  const spans: TextSpan[] = [];
  for (const term of AI_SLOP_TERMS) spans.push(...collect(text, termRegex(term), "ai-slop", `AI-slop phrase: ${term}`, "low"));
  for (const pattern of AI_SLOP_STRUCTURAL_PATTERNS) spans.push(...collect(text, pattern, "ai-slop", "AI-slop structural pattern", "low"));
  for (const term of options.bannedWords ?? DEFAULT_BANNED_WORDS) spans.push(...collect(text, termRegex(term), "banned-word", `Banned word: ${term}`, "medium"));
  for (const pattern of HARD_RULE_PATTERNS) spans.push(...collect(text, pattern, "hard-rule", "Hard rule violation", "high"));
  for (const rule of options.hardRules ?? []) {
    const pattern = customRulePattern(rule);
    if (pattern) spans.push(...collect(text, pattern, "hard-rule", `Brand rule: ${rule}`, "high"));
  }
  for (const pattern of MANUFACTURED_CLAIM_PATTERNS) spans.push(...collect(text, pattern, "manufactured-claim", "Unsupported or manufactured claim", "high"));
  return spans.sort((a, b) => a.start - b.start || b.end - a.end);
}

export function highlightSpans(text: string, spans: TextSpan[]): Array<{ text: string; span?: TextSpan }> {
  const parts: Array<{ text: string; span?: TextSpan }> = [];
  let cursor = 0;
  for (const span of [...spans].sort((a, b) => a.start - b.start || b.end - a.end)) {
    if (span.start < cursor) continue;
    if (span.start > cursor) parts.push({ text: text.slice(cursor, span.start) });
    parts.push({ text: text.slice(span.start, span.end), span });
    cursor = span.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}
