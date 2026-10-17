import { NextResponse } from "next/server";
import { getProfile, saveProfile } from "@/lib/storage";

export const runtime = "nodejs";
type Context = { params: { id: string } };

export async function GET(_request: Request, { params }: Context) {
  const profile = getProfile(params.id);
  return profile ? NextResponse.json({ profile }) : NextResponse.json({ error: "Profile not found" }, { status: 404 });
}
export async function PUT(request: Request, { params }: Context) {
  const existing = getProfile(params.id);
  if (!existing) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  try { const body = await request.json(); return NextResponse.json({ profile: saveProfile({ ...existing, ...body, id: params.id }) }); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
}
