import { createHash } from "node:crypto";
import type { BrandReceipt, Channel } from "@/types";

export function createBrandReceipt(text: string, channel: Channel = "generic", profileId?: string, metadata: { latency_badge?: string; decisions_evaluated?: number } = {}): BrandReceipt {
  const createdAt = new Date().toISOString();
  const canonical = JSON.stringify({ text, channel, profileId: profileId ?? null, createdAt, ...metadata });
  const hash = createHash("sha256").update(canonical).digest("hex");
  return { id: `rcpt_${hash.slice(0, 16)}`, hash, algorithm: "sha256", createdAt, input: { text, channel }, ...(profileId ? { profileId } : {}), ...metadata };
}

export const hashBrandReceipt = (text: string, channel: Channel = "generic", profileId?: string) => createBrandReceipt(text, channel, profileId).hash;
