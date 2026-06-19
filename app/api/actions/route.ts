import { NextResponse } from "next/server";
import { dashboardAction, validateDashboardActionRequest } from "@/src/services/dashboard-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, title: "invalid JSON", summary: "Request body must be JSON." },
      { status: 400 },
    );
  }

  const validation = validateDashboardActionRequest(body);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, title: validation.title, summary: validation.summary },
      { status: validation.status },
    );
  }

  return NextResponse.json(await dashboardAction(validation.action, undefined, validation));
}
