import assert from "node:assert/strict";
import test from "node:test";
import { POST as evaluate } from "@/app/api/v1/evaluate/route";
import { POST as extract } from "@/app/api/v1/brand/extract/route";
import { POST as rewrite } from "@/app/api/v1/rewrite/route";
import { GET as mcpTools, POST as mcpCall } from "@/app/api/mcp/route";

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
