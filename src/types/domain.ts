/** A brand submitted for evaluation. */
export interface Brand {
  id: string;
  name: string;
  websiteUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type Channel = "x" | "twitter" | "threads" | "linkedin" | "instagram" | "pinterest" | "facebook" | "email" | "blog" | "generic";

export interface BrandProfile {
  id: string;
  name: string;
  standard: string;
  voice: string[];
  audience: string[];
  bannedWords: string[];
  hardRules: string[];
  manufacturedClaimPatterns: string[];
  /** Canonical BrandGate JSON shape; legacy camelCase fields remain supported. */
  voice_traits?: string[];
  hard_rules?: string[];
  banned_words?: string[];
  signature_patterns?: string[];
  gold_examples?: string[];
  min_pass_score?: number;
  signaturePatterns?: string[];
  goldExamples?: string[];
  minPassScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BrandPost {
  text: string;
  channel?: Channel;
  publishedAt?: string;
  engagement?: { likes?: number; comments?: number; shares?: number; views?: number };
}

export interface TextSpan {
  start: number;
  end: number;
  text: string;
  category: "ai-slop" | "banned-word" | "hard-rule" | "manufactured-claim";
  rule: string;
  severity: "low" | "medium" | "high";
}

export interface DNAProfile {
  voice: string[];
  signaturePhrases: string[];
  topics: string[];
  vocabulary: string[];
  sentenceLength: { average: number; range: [number, number] };
  punctuation: Record<string, number>;
  sampleCount: number;
}

export interface BrandMemory {
  name: string;
  voice_traits: string[];
  hard_rules: string[];
  banned_words: string[];
  signature_patterns: string[];
  gold_examples: string[];
  min_pass_score: number;
}

export interface HookScore {
  total: number;
  curiosity: number;
  clarity: number;
  specificity: number;
  emotion: number;
  tension: number;
  shareability: number;
  reasons: string[];
}

export interface EvaluationFinding {
  type: TextSpan["category"];
  message: string;
  spans: TextSpan[];
}

export interface BrandReceipt {
  id: string;
  hash: string;
  algorithm: "sha256";
  createdAt: string;
  input: { text: string; channel: Channel };
  profileId?: string;
  latency_badge?: string;
  decisions_evaluated?: number;
}

export type EvaluationStatus = "pending" | "running" | "completed" | "failed";

/** One rubric item used to evaluate a brand. */
export interface EvaluationCriterion {
  id: string;
  name: string;
  description?: string;
  weight?: number;
}

/** The result for a single criterion in an evaluation. */
export interface CriterionResult {
  criterionId: string;
  score: number;
  feedback?: string;
}

/** A persisted evaluation run and its optional results. */
export interface Evaluation {
  id: string;
  brandId: string;
  status: EvaluationStatus;
  score?: number;
  results?: CriterionResult[];
  error?: string;
  createdAt: string;
  completedAt?: string;
}

/** Input accepted by an evaluation request, independent of its transport. */
export interface EvaluationRequest {
  brand: Pick<Brand, "name" | "websiteUrl" | "description">;
  criteria?: EvaluationCriterion[];
  text?: string;
  channel?: Channel;
  profileId?: string;
}

export interface EvaluationResponse {
  evaluation: Evaluation;
  brand: Brand;
}
