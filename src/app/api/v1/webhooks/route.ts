import { NextResponse } from "next/server";
import { listWebhooks, saveWebhook } from "@/lib/storage";

export const runtime = "nodejs";
export async function GET() { return NextResponse.json({ webhooks: listWebhooks() }); }
export async function POST(request: Request) { try { const body = await request.json() as { url?: string; events?: string[] }; const url = body.url; if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 }); return NextResponse.json({ webhook: saveWebhook({ url, events: body.events }) }, { status: 201 }); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); } }
