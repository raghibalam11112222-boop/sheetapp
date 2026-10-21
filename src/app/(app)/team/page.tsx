import { getTeamState } from "@/actions/team";
import { requireOrg } from "@/lib/auth/guards";
import { TeamView } from "./team-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team",
  description: "Invite teammates and manage workspace roles.",
};

export default async function TeamPage() {
  await requireOrg();
  const state = await getTeamState();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#111111]">Team</h1>
        <p className="text-sm text-[#6B7280]">
          Manage who can access {state.orgName}.
        </p>
      </div>
      <TeamView state={state} />
    </div>
  );
}
