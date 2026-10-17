import type { BrandProfile } from "@/types";
import { checkRules } from "./rules";
import { scoreHook } from "./scoring";

export interface JEVResult { provider: "jev" | "local"; score: number; feedback: string[]; }

/** Optional adapter. Missing keys and network errors always use deterministic local scoring. */
export async function evaluateWithJEV(text: string, profile?: BrandProfile): Promise<JEVResult> {
  const key = process.env.JEV_API_KEY;
  if (!key) return localResult(text, profile);
  try {
    const response = await fetch(process.env.JEV_API_URL ?? "https://api.jev.ai/v1/evaluate", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ context: { draft: text, brand_memory: profile }, questions: [
      { id: "hard_rules", type: "noul", prompt: "Does this draft violate a hard brand rule?" },
      { id: "voice_alignment", type: "choice", options: ["aligned", "mixed", "misaligned"], prompt: "How aligned is the voice?" },
      { id: "hook_strength", type: "score", range: [0, 1], prompt: "How strong is the opening hook?" }
    ] }) });
    if (!response.ok) throw new Error(`JEV responded ${response.status}`);
    const data = await response.json() as { score?: number; feedback?: string[] };
    if (typeof data.score !== "number") throw new Error("Invalid JEV response");
    return { provider: "jev", score: data.score, feedback: data.feedback ?? [] };
  } catch { return localResult(text, profile); }
}

function localResult(text: string, profile?: BrandProfile): JEVResult {
  const rules = checkRules(text, profile);
  const hook = scoreHook(text);
  return { provider: "local", score: Math.round((rules.score + hook.total / 40 * 100) / 2), feedback: rules.findings.map((finding) => finding.message) };
}
