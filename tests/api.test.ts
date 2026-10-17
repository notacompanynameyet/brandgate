import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { POST as evaluate } from "@/app/api/v1/evaluate/route";
import { POST as extract } from "@/app/api/v1/brand/extract/route";
import { POST as rewrite } from "@/app/api/v1/rewrite/route";
import { GET as mcpTools, POST as mcpCall } from "@/app/api/mcp/route";
import { POST as deliverQueue } from "@/app/api/v1/webhooks/deliver/route";
import { POST as tournament } from "@/app/api/v1/tournament/route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

test("evaluate API returns deterministic rules, score, route, and receipt data", async () => {
  process.env.JEV_API_KEY = "";
  const response = await evaluate(jsonRequest({
    text: "A clear lesson: never promise what you cannot verify.",
    channel: "linkedin"
  }));
  const body = await response.json() as {
    pass: boolean;
    provider: { provider: string };
    rules: { spans: Array<{ category: string }> };
    receipt: { algorithm: string; hash: string };
    verdict: string;
    overall_score: number;
    slop_score: number;
    hook_score: number;
    rule_results: unknown[];
    channel_routing: { recommended_format: string };
    receipt_hash: string;
    latency_badge: string;
  };

  assert.equal(response.status, 200);
  assert.equal(body.provider.provider, "local");
  assert.equal(body.pass, false);
  assert.ok(body.rules.spans.some((span) => span.category === "hard-rule"));
  assert.equal(body.receipt.algorithm, "sha256");
  assert.match(body.receipt.hash, /^[a-f0-9]{64}$/);
  assert.equal(body.receipt_hash, body.receipt.hash);
  assert.ok(["APPROVED", "HELD_FOR_REVIEW", "REJECTED"].includes(body.verdict));
  assert.ok(body.overall_score >= 0 && body.overall_score <= 1);
  assert.ok(body.slop_score >= 0 && body.slop_score <= 100);
  assert.ok(body.hook_score >= 0 && body.hook_score <= 100);
  assert.ok(body.rule_results.length > 0);
  assert.equal(body.channel_routing.recommended_format, "text post");
  assert.match(body.latency_badge, /decisions evaluated in \d+ms/);
});

test("evaluate API rejects missing text and malformed JSON", async () => {
  const missing = await evaluate(jsonRequest({ channel: "generic" }));
  assert.equal(missing.status, 400);
  assert.deepEqual(await missing.json(), { error: "text is required" });

  const malformed = await evaluate(new Request("http://localhost/api", {
    method: "POST",
    body: "not-json"
  }));
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: "Invalid JSON body" });
});

test("DNA and rewrite API routes expose successful and validation responses", async () => {
  const dnaResponse = await extract(jsonRequest({ posts: [
    "Clear systems help thoughtful teams.",
    "Thoughtful teams build clear systems.",
    "Good systems make hard work feel calm."
  ] }));
  assert.equal(dnaResponse.status, 200);
  const dnaBody = await dnaResponse.json() as { dna: { sampleCount: number }; brand_memory: { voice_traits: string[]; min_pass_score: number; gold_examples: string[] } };
  assert.equal(dnaBody.dna.sampleCount, 3);
  assert.ok(dnaBody.brand_memory.voice_traits.length > 0);
  assert.equal(dnaBody.brand_memory.min_pass_score, 0.82);
  assert.equal(dnaBody.brand_memory.gold_examples.length, 3);

  const tooFew = await extract(jsonRequest({ posts: ["Only one"] }));
  assert.equal(tooFew.status, 400);

  const rewritten = await rewrite(jsonRequest({ text: "Unlock a robust workflow.", channel: "generic" }));
  assert.equal(rewritten.status, 200);
  const rewriteBody = await rewritten.json() as { original: string; rewritten: string; spans: unknown[] };
  assert.equal(rewriteBody.original, "Unlock a robust workflow.");
  assert.notEqual(rewriteBody.rewritten, rewriteBody.original);
  assert.ok(rewriteBody.spans.length >= 1);
});

test("MCP exposes the four agent-facing BrandGate tools", async () => {
  const tools = await (await mcpTools()).json() as { tools: Array<{ name: string }> };
  assert.deepEqual(tools.tools.map((tool) => tool.name).slice(0, 4), [
    "brandgate_get_memory",
    "brandgate_extract_dna",
    "brandgate_evaluate_draft",
    "brandgate_split_threads"
  ]);

  const response = await mcpCall(jsonRequest({
    id: 1,
    method: "tools/call",
    params: { name: "brandgate_evaluate_draft", arguments: { draft: "A clear lesson for teams.", target_channel: "linkedin" } }
  }));
  const body = await response.json() as { result: { structuredContent: { verdict: string; receipt_hash: string } } };
  assert.equal(response.status, 200);
  assert.ok(["APPROVED", "HELD_FOR_REVIEW", "REJECTED"].includes(body.result.structuredContent.verdict));
  assert.match(body.result.structuredContent.receipt_hash, /^[a-f0-9]{64}$/);
});

test("evaluate API receipt_hash verifies against the canonical SHA-256 payload", async () => {
  process.env.JEV_API_KEY = "";
  const text = "A concrete lesson for careful teams.";
  const channel = "linkedin";
  const response = await evaluate(jsonRequest({ draft: text, target_channel: channel }));
  const body = await response.json() as {
    receipt_hash: string;
    receipt: { createdAt: string; profileId?: string; latency_badge?: string; decisions_evaluated?: number };
  };
  const canonical = JSON.stringify({
    text,
    channel,
    profileId: body.receipt.profileId ?? null,
    createdAt: body.receipt.createdAt,
    latency_badge: body.receipt.latency_badge,
    decisions_evaluated: body.receipt.decisions_evaluated
  });

  assert.equal(response.status, 200);
  assert.equal(body.receipt_hash, createHash("sha256").update(canonical).digest("hex"));
});

test("MCP brandgate_split_threads returns numbered posts for long drafts", async () => {
  const draft = Array.from({ length: 18 }, (_, index) => `A useful thread sentence ${index + 1} explains the decision.`).join(" ");
  const response = await mcpCall(jsonRequest({
    id: 2,
    method: "tools/call",
    params: { name: "brandgate_split_threads", arguments: { draft } }
  }));
  const body = await response.json() as { result: { structuredContent: { posts: string[] } } };
  const posts = body.result.structuredContent.posts;

  assert.equal(response.status, 200);
  assert.ok(posts.length > 1);
  assert.match(posts[0], /1\//);
  assert.match(posts.at(-1) ?? "", new RegExp(`${posts.length}/${posts.length}`));
});

test("MCP brandgate_evaluate_draft accepts canonical agent arguments", async () => {
  const response = await mcpCall(jsonRequest({
    id: 3,
    method: "tools/call",
    params: {
      name: "brandgate_evaluate_draft",
      arguments: { draft: "A specific lesson for thoughtful teams.", target_channel: "linkedin", brand_profile_id: "yet-editorial-standard" }
    }
  }));
  const body = await response.json() as { result: { structuredContent: { verdict: string; overall_score: number; receipt_hash: string; channel_routing: { recommended_format: string } } } };
  const result = body.result.structuredContent;

  assert.equal(response.status, 200);
  assert.ok(["APPROVED", "HELD_FOR_REVIEW", "REJECTED"].includes(result.verdict));
  assert.ok(result.overall_score >= 0 && result.overall_score <= 1);
  assert.match(result.receipt_hash, /^[a-f0-9]{64}$/);
  assert.equal(result.channel_routing.recommended_format, "text post");
});

test("publishing queue simulator returns a signed queued payload", async () => {
  const response = await deliverQueue(jsonRequest({
    event: "publishing.approved",
    destination: "YET Postroom (simulated)",
    simulate: true,
    payload: { draft: "A specific lesson for thoughtful teams.", receipt_hash: "a".repeat(64) }
  }));
  const body = await response.json() as { status: string; transport: string; destination: string; queue_receipt_hash: string; payload: { receipt_hash: string } };

  assert.equal(response.status, 200);
  assert.equal(body.status, "queued");
  assert.equal(body.transport, "simulated");
  assert.equal(body.destination, "YET Postroom (simulated)");
  assert.equal(body.payload.receipt_hash, "a".repeat(64));
  assert.match(body.queue_receipt_hash, /^[a-f0-9]{64}$/);
});

test("agent-to-queue path blocks slop, rewrites it, and clears the 0.82 gate", async () => {
  const draft = "In today's fast-paced world, let's unlock a robust workflow. Let's delve into this game-changer. What did a failed launch teach us? We rebuilt the small workflow that helped a team keep its promise.";
  const blocked = await evaluate(jsonRequest({ draft, target_channel: "linkedin", brand_profile_id: "yet-editorial-standard" }));
  const blockedBody = await blocked.json() as { slop_score: number; verdict: string };
  assert.ok(blockedBody.slop_score > 0);
  assert.notEqual(blockedBody.verdict, "APPROVED");

  const rewritten = await rewrite(jsonRequest({ text: draft, channel: "linkedin", profileId: "yet-editorial-standard" }));
  const rewrittenBody = await rewritten.json() as { rewritten: string };
  const cleanedDraft = `${rewrittenBody.rewritten}\n\nWhat did a failed launch teach you? We cut 3 noisy steps, fixed 2 broken handoffs, and wrote 1 lesson for our team. The hard truth: fear made the old process too slow, but the new one is easier to trust.`;
  const final = await evaluate(jsonRequest({ draft: cleanedDraft, target_channel: "linkedin", brand_profile_id: "yet-editorial-standard" }));
  const finalBody = await final.json() as { verdict: string; overall_score: number; receipt_hash: string };

  assert.equal(finalBody.verdict, "APPROVED");
  assert.ok(finalBody.overall_score >= 0.82);
  assert.match(finalBody.receipt_hash, /^[a-f0-9]{64}$/);
});

test("coffee tournament runs the full firewall and lets the clean human draft win", async () => {
  const drafts = [
    "In today's fast-paced mornings, let's delve into how our revolutionary new pour-over bags unlock the ultimate coffee experience anywhere you go!",
    "Throw away your espresso machine right now! Our new pocket brew bags guarantee 500% better taste in 10 seconds flat. Comment \"BREW\" below!",
    "Hotel room coffee is almost always stale. We spent four months sealing 18 grams of fresh-ground estate coffee into nitrogen-flushed filter bags so you only need a kettle when you travel."
  ];
  const response = await tournament(jsonRequest({ candidates: drafts }));
  const body = await response.json() as { winner: { index: number; score: number }; ranking: Array<{ index: number; score: number; verdict: string; slop_penalty_count: number }> };
  const byIndex = new Map(body.ranking.map((item) => [item.index, item]));

  assert.equal(response.status, 200);
  assert.equal(body.winner.index, 2);
  assert.ok(body.winner.score > 82);
  assert.ok((byIndex.get(0)?.score ?? 100) < 50);
  assert.ok((byIndex.get(1)?.score ?? 100) < 50);
  assert.equal(byIndex.get(2)?.verdict, "APPROVED");
  assert.ok((byIndex.get(0)?.slop_penalty_count ?? 0) >= 4);
  assert.ok((byIndex.get(1)?.slop_penalty_count ?? 0) < 2);
});
