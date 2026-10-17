import { NextResponse } from "next/server";
import { listProfiles, saveProfile } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET() { return NextResponse.json({ profiles: listProfiles() }); }

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string };
    if (!body.name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
    return NextResponse.json({ profile: saveProfile(body as Parameters<typeof saveProfile>[0]) }, { status: 201 });
  } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
}
