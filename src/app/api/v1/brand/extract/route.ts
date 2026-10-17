import { NextResponse } from "next/server";
import { extractDNA, toBrandMemory } from "@/engine";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await request.json() as { posts?: Array<{ text?: string; content?: string } | string>; name?: string };
    if (!Array.isArray(body.posts)) return NextResponse.json({ error: "posts must be an array" }, { status: 400 });
    const posts = body.posts.map((post) => typeof post === "string" ? post : post.text ?? post.content ?? "");
    const dna = extractDNA(posts);
    return NextResponse.json({ dna, brand_memory: toBrandMemory(dna, posts, body.name) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to extract DNA" }, { status: 400 }); }
}
