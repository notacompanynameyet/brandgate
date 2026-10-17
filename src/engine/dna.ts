import type { BrandMemory, BrandPost, DNAProfile } from "@/types";

const STOP = new Set("a an and are as at be by for from has have i in is it of on or that the this to was we were with you your our".split(" "));

export function extractDNA(posts: Array<BrandPost | string>): DNAProfile {
  const texts = posts.map((post) => typeof post === "string" ? post : post.text).filter(Boolean).slice(0, 10);
  if (texts.length < 3) throw new Error("DNA extraction requires between 3 and 10 posts");
  const words = texts.join(" ").toLowerCase().match(/[a-z][a-z'-]+/g) ?? [];
  const counts = new Map<string, number>();
  words.filter((word) => !STOP.has(word) && word.length > 3).forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1));
  const vocabulary = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12).map(([word]) => word);
  const sentences = texts.flatMap((text) => text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean));
  const lengths = sentences.map((s) => s.split(/\s+/).length);
  const punctuation: Record<string, number> = {};
  for (const mark of ["!", "?", "—", ":", ","]) punctuation[mark] = texts.join(" ").split(mark).length - 1;
  const voice = [
    lengths.reduce((a, b) => a + b, 0) / lengths.length < 14 ? "concise" : "detailed",
    punctuation["!"] > texts.length ? "energetic" : "measured",
    punctuation["?"] > 0 ? "curious" : "direct"
  ];
  const signaturePhrases = texts.flatMap((text) => text.match(/\b\w+(?:\s+\w+){1,2}\b/g) ?? []).filter((phrase) => phrase.split(" ").every((word) => !STOP.has(word.toLowerCase()))).slice(0, 5);
  return { voice, signaturePhrases, topics: vocabulary.slice(0, 6), vocabulary, sentenceLength: { average: Math.round((lengths.reduce((a, b) => a + b, 0) / lengths.length) * 10) / 10, range: [Math.min(...lengths), Math.max(...lengths)] }, punctuation, sampleCount: texts.length };
}

export const extractBrandDNA = extractDNA;

export function toBrandMemory(dna: DNAProfile, posts: Array<BrandPost | string>, name = "Extracted Brand Memory"): BrandMemory {
  const examples = posts.map((post) => typeof post === "string" ? post : post.text).filter(Boolean).slice(0, 10);
  return {
    name,
    voice_traits: dna.voice,
    hard_rules: ["No manufactured claims", "No synthetic AI clichés"],
    banned_words: [],
    signature_patterns: dna.signaturePhrases,
    gold_examples: examples,
    min_pass_score: 0.82
  };
}
