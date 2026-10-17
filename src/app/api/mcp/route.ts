import { NextResponse } from "next/server";
import { checkRules, extractDNA, toBrandMemory, routeContent, routeDetails, scoreHook, createBrandReceipt, splitThreads } from "@/engine";
import { listProfiles, getProfile, DEFAULT_YET_PROFILE } from "@/lib/storage";

export const runtime = "nodejs";

const tools = [
  { name: "brandgate_get_memory", description: "Read a BrandGate profile", inputSchema: { type: "object", properties: { brand_profile_id: { type: "string" } } } },
  { name: "brandgate_extract_dna", description: "Extract deterministic Brand DNA from 3-10 posts", inputSchema: { type: "object", properties: { posts: { type: "array", items: { type: "string" } }, name: { type: "string" } }, required: ["posts"] } },
  { name: "brandgate_evaluate_draft", description: "Evaluate a draft and return a tamper-evident Brand Receipt", inputSchema: { type: "object", properties: { draft: { type: "string" }, target_channel: { type: "string" }, brand_profile_id: { type: "string" } }, required: ["draft"] } },
  { name: "brandgate_split_threads", description: "Split long copy into numbered Threads posts", inputSchema: { type: "object", properties: { draft: { type: "string" }, limit: { type: "number" } }, required: ["draft"] } },
  { name: "brand_profiles", description: "List available brand profiles", inputSchema: { type: "object", properties: {} } }
];

export async function GET() { return NextResponse.json({ name: "brandgate", version: "1", tools }); }

export async function POST(request: Request) {
  let payload: { id?: string | number; method?: string; params?: { name?: string; arguments?: Record<string, unknown> }; tool?: string; args?: Record<string, unknown> };
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const name = payload.tool ?? payload.params?.name ?? (payload.method === "tools/list" ? undefined : undefined);
  if (payload.method === "initialize") return NextResponse.json({ jsonrpc: "2.0", id: payload.id ?? null, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "brandgate", version: "1" } } });
  if (payload.method === "tools/list" || payload.method === "list_tools") return NextResponse.json({ jsonrpc: "2.0", id: payload.id ?? null, result: { tools } });
  if (!name) return NextResponse.json({ jsonrpc: "2.0", id: payload.id ?? null, error: { code: -32600, message: "tool is required" } }, { status: 400 });
  const args = payload.args ?? payload.params?.arguments ?? {};
  try {
    const result = await dispatch(name, args);
    return NextResponse.json(payload.method?.startsWith("tools/") || payload.id !== undefined ? { jsonrpc: "2.0", id: payload.id ?? null, result: { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result } } : result);
  } catch (error) { return NextResponse.json({ jsonrpc: "2.0", id: payload.id ?? null, error: { code: -32602, message: error instanceof Error ? error.message : "Invalid arguments" } }, { status: 400 }); }
}

async function dispatch(name: string, args: Record<string, unknown>): Promise<unknown> {
  if (name === "brandgate_get_memory") {
    const profile = args.brand_profile_id ? getProfile(String(args.brand_profile_id)) : DEFAULT_YET_PROFILE;
    return { profile: profile ?? DEFAULT_YET_PROFILE };
  }
  if (name === "brand_profiles" || name === "list_brand_profiles") return { profiles: listProfiles() };
  if (name === "brandgate_extract_dna" || name === "brand_extract_dna" || name === "extract_dna") {
    if (!Array.isArray(args.posts)) throw new Error("posts must be an array");
    const posts = args.posts as string[];
    const dna = extractDNA(posts);
    return { dna, brand_memory: toBrandMemory(dna, posts, typeof args.name === "string" ? args.name : undefined) };
  }
  if (name === "brandgate_split_threads") {
    const draft = String(args.draft ?? args.text ?? "");
    if (!draft) throw new Error("draft is required");
    return { posts: splitThreads(draft, typeof args.limit === "number" ? args.limit : 500).map((text, index, all) => `${text}\n\n${index + 1}/${all.length}`) };
  }
  if (name === "brand_route" || name === "route_content") return { routed: routeContent(String(args.text ?? ""), String(args.channel ?? "generic") as Parameters<typeof routeContent>[1]) };
  if (name === "brandgate_evaluate_draft" || name === "brand_evaluate" || name === "evaluate") {
    const text = String(args.draft ?? args.text ?? "");
    if (!text) throw new Error("text is required");
    const profile = (args.brand_profile_id ?? args.profileId) ? getProfile(String(args.brand_profile_id ?? args.profileId)) : DEFAULT_YET_PROFILE;
    const selectedProfile = profile ?? DEFAULT_YET_PROFILE;
    const channel = String(args.target_channel ?? args.channel ?? "generic") as Parameters<typeof routeContent>[1];
    const rules = checkRules(text, selectedProfile);
    const hook = scoreHook(text);
    const receipt = createBrandReceipt(text, channel, selectedProfile.id);
    const overall_score = Number(Math.max(0, Math.min(1, (rules.score / 100) * 0.65 + (hook.total / 40) * 0.35)).toFixed(3));
    const verdict = rules.spans.some((span) => span.severity === "high") ? "REJECTED" : overall_score >= (selectedProfile.min_pass_score ?? selectedProfile.minPassScore ?? 0.82) ? "APPROVED" : "HELD_FOR_REVIEW";
    return { verdict, overall_score, slop_score: Math.min(100, rules.spans.filter((span) => span.category === "ai-slop").length * 12), hook_score: Math.round(hook.total / 40 * 100), rules, hook, routed: routeContent(text, channel), channel_routing: routeDetails(text, channel), receipt, receipt_hash: receipt.hash, profile: selectedProfile };
  }
  throw new Error(`Unknown tool: ${name}`);
}
