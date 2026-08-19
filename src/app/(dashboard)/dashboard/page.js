import { getMachineId } from "@/shared/utils/machine";
import DashboardHub from "@/shared/components/dashboard/DashboardHub";

export default async function DashboardPage() {
  const machineId = await getMachineId();
  return <DashboardHub machineId={machineId} />;
}
