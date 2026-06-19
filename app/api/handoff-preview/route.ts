import { NextResponse } from "next/server";
import { handoffPreview } from "@/src/services/dashboard-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await handoffPreview());
}
