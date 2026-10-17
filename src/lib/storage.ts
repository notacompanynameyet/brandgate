import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { BrandProfile, Evaluation, Brand } from "@/types";

const dataDir = join(process.cwd(), "data");
const files = { profiles: join(dataDir, "brand-profiles.json"), evaluations: join(dataDir, "evaluations.json"), webhooks: join(dataDir, "webhooks.json") };

export const DEFAULT_YET_PROFILE: BrandProfile = {
  id: "yet-editorial-standard",
  name: "YET Editorial Standard",
  standard: "Clear, specific, useful, human. Prefer a sharp point of view over generic polish.",
  voice: ["direct", "curious", "warm", "specific"],
  audience: ["builders", "creative operators", "thoughtful professionals"],
  bannedWords: ["literally", "obviously", "just", "simply", "cheap", "guaranteed"],
  hardRules: ["No absolute promises", "No invented statistics", "No competitor attacks", "No discriminatory language"],
  manufacturedClaimPatterns: ["unsupported superlatives", "unnamed studies", "unverifiable customer counts"],
  voice_traits: ["clear", "curious", "human"],
  hard_rules: ["No manufactured claims", "No synthetic AI clichés", "No absolute promises", "No competitor attacks"],
  banned_words: ["literally", "obviously", "just", "simply", "cheap", "guaranteed"],
  signature_patterns: ["specific lesson", "concrete material detail"],
  gold_examples: ["A clear lesson is more useful than a polished promise."],
  min_pass_score: 0.82,
  signaturePatterns: ["specific lesson", "concrete material detail"],
  goldExamples: ["A clear lesson is more useful than a polished promise."],
  minPassScore: 0.82,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
};

function ensureData() { if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true }); }
function readJson<T>(file: string, fallback: T): T { ensureData(); try { return JSON.parse(readFileSync(file, "utf8")) as T; } catch { writeJson(file, fallback); return fallback; } }
function writeJson<T>(file: string, value: T) { ensureData(); writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8"); }

export function listProfiles(): BrandProfile[] {
  const profiles = readJson<BrandProfile[]>(files.profiles, [DEFAULT_YET_PROFILE]);
  if (!profiles.some((profile) => profile.id === DEFAULT_YET_PROFILE.id)) profiles.unshift(DEFAULT_YET_PROFILE);
  return profiles;
}
export function getProfile(id: string): BrandProfile | undefined { return listProfiles().find((profile) => profile.id === id); }
export function saveProfile(input: Partial<BrandProfile> & Pick<BrandProfile, "name">): BrandProfile {
  const profiles = listProfiles();
  const now = new Date().toISOString();
  const profile: BrandProfile = {
    id: input.id ?? `profile_${randomUUID()}`,
    name: input.name,
    standard: input.standard ?? DEFAULT_YET_PROFILE.standard,
    voice: input.voice ?? input.voice_traits ?? DEFAULT_YET_PROFILE.voice,
    audience: input.audience ?? DEFAULT_YET_PROFILE.audience,
    bannedWords: input.bannedWords ?? input.banned_words ?? DEFAULT_YET_PROFILE.bannedWords,
    hardRules: input.hardRules ?? input.hard_rules ?? DEFAULT_YET_PROFILE.hardRules,
    manufacturedClaimPatterns: input.manufacturedClaimPatterns ?? DEFAULT_YET_PROFILE.manufacturedClaimPatterns,
    voice_traits: input.voice_traits ?? input.voice ?? DEFAULT_YET_PROFILE.voice_traits,
    hard_rules: input.hard_rules ?? input.hardRules ?? DEFAULT_YET_PROFILE.hard_rules,
    banned_words: input.banned_words ?? input.bannedWords ?? DEFAULT_YET_PROFILE.banned_words,
    signature_patterns: input.signature_patterns ?? input.signaturePatterns ?? DEFAULT_YET_PROFILE.signature_patterns,
    gold_examples: input.gold_examples ?? input.goldExamples ?? DEFAULT_YET_PROFILE.gold_examples,
    min_pass_score: input.min_pass_score ?? input.minPassScore ?? DEFAULT_YET_PROFILE.min_pass_score,
    signaturePatterns: input.signaturePatterns ?? input.signature_patterns ?? DEFAULT_YET_PROFILE.signaturePatterns,
    goldExamples: input.goldExamples ?? input.gold_examples ?? DEFAULT_YET_PROFILE.goldExamples,
    minPassScore: input.minPassScore ?? input.min_pass_score ?? DEFAULT_YET_PROFILE.minPassScore,
    createdAt: input.createdAt ?? now,
    updatedAt: now
  };
  const index = profiles.findIndex((item) => item.id === profile.id);
  if (index >= 0) profiles[index] = profile; else profiles.push(profile);
  writeJson(files.profiles, profiles);
  return profile;
}

export function listEvaluations(): Evaluation[] { return readJson<Evaluation[]>(files.evaluations, []); }
export function saveEvaluation(evaluation: Evaluation): Evaluation { const all = listEvaluations(); const index = all.findIndex((item) => item.id === evaluation.id); if (index >= 0) all[index] = evaluation; else all.push(evaluation); writeJson(files.evaluations, all); return evaluation; }
export function getEvaluation(id: string): Evaluation | undefined { return listEvaluations().find((item) => item.id === id); }

export interface WebhookRecord { id: string; url: string; events: string[]; createdAt: string; lastDeliveredAt?: string; lastError?: string; }
export function listWebhooks(): WebhookRecord[] { return readJson<WebhookRecord[]>(files.webhooks, []); }
export function saveWebhook(input: Pick<WebhookRecord, "url"> & Partial<WebhookRecord>): WebhookRecord { const all = listWebhooks(); const item: WebhookRecord = { id: input.id ?? `wh_${randomUUID()}`, url: input.url, events: input.events ?? ["evaluation.completed"], createdAt: input.createdAt ?? new Date().toISOString() }; all.push(item); writeJson(files.webhooks, all); return item; }
export async function deliverWebhook(event: string, payload: unknown, overrideUrl?: string): Promise<Array<{ id: string; ok: boolean; error?: string }>> {
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  const configured = listWebhooks().filter((item) => item.events.includes(event) || item.events.includes("*"));
  const envWebhookUrl = process.env.POSTROOM_WEBHOOK_URL ?? process.env.WEBHOOK_URL;
  const webhooks = overrideUrl
    ? [{ id: "request-override", url: overrideUrl, events: ["*"] }]
    : configured.length > 0
      ? configured
      : envWebhookUrl
        ? [{ id: "env-default", url: envWebhookUrl, events: ["*"] }]
        : [];
  for (const webhook of webhooks) {
    try { const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 5000); const response = await fetch(webhook.url, { method: "POST", headers: { "content-type": "application/json", "x-brandgate-event": event }, body: JSON.stringify({ event, payload }), signal: controller.signal }); clearTimeout(timeout); results.push({ id: webhook.id, ok: response.ok }); }
    catch (error) { results.push({ id: webhook.id, ok: false, error: error instanceof Error ? error.message : "delivery failed" }); }
  }
  return results;
}

export function brandFromProfile(profile: BrandProfile): Brand { return { id: profile.id, name: profile.name, description: profile.standard, createdAt: profile.createdAt, updatedAt: profile.updatedAt }; }
