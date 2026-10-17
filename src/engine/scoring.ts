import type { HookScore } from "@/types";

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, Math.round(value)));

/** Transparent 40-point hook score: six independently inspectable signals. */
export function scoreHook(text: string): HookScore {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/) : [];
  const questions = (trimmed.match(/\?/g) ?? []).length;
  const numbers = (trimmed.match(/\b\d+(?:\.\d+)?%?\b/g) ?? []).length;
  const concrete = (trimmed.match(/\b(?:how|why|when|today|tomorrow|step|ways?|mistake|lesson|example|before|after)\b/gi) ?? []).length;
  const emotional = (trimmed.match(/\b(?:love|hate|fear|surprise|truth|secret|wrong|fail|win|warning|hard|easy|breakthrough)\b/gi) ?? []).length;
  const tension = (trimmed.match(/\b(?:but|however|until|instead|despite|wrong|never|stop|not)\b/gi) ?? []).length;
  const curiosity = clamp(questions * 4 + (words.length >= 5 && words.length <= 22 ? 3 : 1), 8);
  const clarity = clamp((words.length > 0 ? 5 : 0) + (words.length <= 35 ? 2 : 0), 7);
  const specificity = clamp(numbers * 2 + concrete, 7);
  const emotion = clamp(emotional * 2, 6);
  const tensionScore = clamp(tension * 2, 6);
  const shareability = clamp((trimmed.match(/\b(?:you|your|we|our)\b/gi) ?? []).length + (trimmed.includes("\n") ? 1 : 0) + (words.length >= 8 ? 1 : 0), 6);
  const reasons: string[] = [];
  if (questions) reasons.push("Uses a question to create an open loop");
  if (numbers || concrete) reasons.push("Includes concrete detail");
  if (tension) reasons.push("Contains contrast or tension");
  if (emotional) reasons.push("Uses emotionally charged language");
  return { total: curiosity + clarity + specificity + emotion + tensionScore + shareability, curiosity, clarity, specificity, emotion, tension: tensionScore, shareability, reasons };
}

export function viralityScore(text: string): HookScore { return scoreHook(text); }
