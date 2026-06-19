import { NextResponse } from "next/server";
import { readPresenceSnapshot, writePresenceSnapshot } from "@/src/services/dashboard-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readPresenceSnapshot());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({ status: "available" }));
  const status = typeof body.status === "string" ? body.status : "available";
  if (!["available", "busy", "reviewing", "offline"].includes(status)) {
    return NextResponse.json({ ok: false, title: "invalid presence status", summary: "Use available, busy, reviewing, or offline." }, { status: 400 });
  }
  return NextResponse.json(await writePresenceSnapshot(status));
}
