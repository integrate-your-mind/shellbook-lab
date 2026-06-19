import { DashboardApp } from "@/src/app/dashboard-app";
import { dashboardSnapshot } from "@/src/services/dashboard-service";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialSnapshot = await dashboardSnapshot().catch(() => null);
  return <DashboardApp initialSnapshot={initialSnapshot} />;
}
