import { NextResponse } from "next/server";
import { dashboardSnapshot } from "@/src/services/dashboard-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await dashboardSnapshot());
}
