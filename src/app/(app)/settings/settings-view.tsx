"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Minus, Trash2 } from "lucide-react";
import {
  deleteApplicationAction,
  renameApplicationAction,
  updateOrganizationNameAction,
  updateProfileAction,
  deleteAccountAction,
} from "@/actions/settings";
import {
  deleteSignedInFirebaseUser,
  signOutApp,
} from "@/lib/auth/client";
import {
  revokeOtherSessionsAction,
  revokeSessionAction,
} from "@/actions/security";
import {
  ROLE_LABELS,
  can,
  type Permission,
  type Role,
} from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS = [
  "General",
  "Workspace",
  "Members",
  "Permissions",
  "Data",
  "Billing",
  "Security",
] as const;

const MATRIX: { permission: Permission; label: string }[] = [
  { permission: "record:create", label: "Create records" },
  { permission: "record:update", label: "Edit records" },
  { permission: "record:delete", label: "Delete records" },
  { permission: "record:export", label: "Export data" },
  { permission: "app:create", label: "Create apps" },
  { permission: "app:edit", label: "Rename apps" },
  { permission: "app:delete", label: "Delete apps" },
  { permission: "team:invite", label: "Invite teammates" },
  { permission: "team:manage", label: "Manage team" },
  { permission: "settings:manage", label: "Manage settings" },
  { permission: "billing:manage", label: "Manage billing" },
  { permission: "workflow:manage", label: "Manage workflows" },
];

const ROLES: Role[] = ["ADMIN", "MANAGER", "MEMBER", "VIEWER"];

export interface SettingsState {
  orgName: string;
  profileName: string;
  email: string;
  canManage: boolean;
  plan: string;
  memberCount: number;
  tableCount: number;
  totalRecords: number;
  sessionTotal: number;
  sessions: {
    id: string;
    current: boolean;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
  }[];
  applications: {
    id: string;
    name: string;
    status: string;
    createdAt: string;
    tableCount: number;
    recordCount: number;
  }[];
}

export function SettingsView({ state }: { state: SettingsState }) {
  const router = useRouter();
  const [orgName, setOrgName] = useState(state.orgName);
  const [profileName, setProfileName] = useState(state.profileName);
  const [savingOrg, setSavingOrg] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SettingsState["applications"][number] | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [appNames, setAppNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(state.applications.map((app) => [app.id, app.name]))
  );

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault();
    setSavingOrg(true);
    const result = await updateOrganizationNameAction(orgName);
    setSavingOrg(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Workspace updated");
    router.refresh();
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    const result = await updateProfileAction(profileName);
    setSavingProfile(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Profile updated");
    router.refresh();
  }

  async function renameApp(appId: string) {
    const name = appNames[appId];
    if (!name?.trim()) return;
    setRenaming(appId);
    const result = await renameApplicationAction(appId, name);
    setRenaming(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Application renamed");
    router.refresh();
  }

  async function deleteAccount() {
    setDeleteAccountLoading(true);
    const result = await deleteAccountAction();
    setDeleteAccountLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    // All SheetApp data is gone — finish by revoking the Firebase identity
    // itself and clearing the session cookie. Firebase requires a recent
    // login for identity deletion: when it refuses we keep the destructive
    // order safe (data first) and the user can retry in the fresh session
    // they sign into next (the retry needs one more Delete press).
    const identityDeletion = await deleteSignedInFirebaseUser();
    if (!identityDeletion.ok) {
      toast.message(
        "Data deleted. Your login could not be revoked yet — sign in again and Delete once more to finish."
      );
    }
    await signOutApp();
    router.push("/");
    router.refresh();
  }

  async function deleteApp() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const result = await deleteApplicationAction(deleteTarget.id);
    setDeleteLoading(false);
    setDeleteTarget(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Application deleted");
    router.refresh();
  }

  async function revokeSession(sessionId: string) {
    setRevoking(sessionId);
    const result = await revokeSessionAction(sessionId);
    setRevoking(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Session revoked");
    router.refresh();
  }

  async function signOutOthers() {
    setRevoking("all");
    const result = await revokeOtherSessionsAction();
    setRevoking(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.data.revoked === 1 ? "Signed out 1 other session" : `Signed out ${result.data.revoked} other sessions`
    );
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <nav className="sticky top-14 z-10 -mx-1 flex gap-1 overflow-x-auto bg-[#F8F9FA] py-2">
        {SECTIONS.map((section) => (
          <a
            key={section}
            href={`#${section.toLowerCase()}`}
            className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-[#6B7280] hover:bg-white hover:text-[#111111]"
          >
            {section}
          </a>
        ))}
      </nav>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card id="general" className="scroll-mt-32">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">General</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name">Display name</Label>
                <Input
                  id="profile-name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  maxLength={60}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={state.email} disabled />
              </div>
              <Button type="submit" loading={savingProfile}>
                Save profile
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card id="workspace" className="scroll-mt-32">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveOrg} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="org-name">Workspace name</Label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={!state.canManage}
                  maxLength={60}
                />
              </div>
              <Button type="submit" loading={savingOrg} disabled={!state.canManage}>
                Save workspace
              </Button>
              {!state.canManage && (
                <p className="text-xs text-[#6B7280]">Only admins can change workspace settings.</p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card id="members" className="scroll-mt-32">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[#6B7280]">
              <span className="text-xl font-semibold text-[#111111]">{state.memberCount}</span>{" "}
              {state.memberCount === 1 ? "member" : "members"} in this workspace.
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/team">Manage members</Link>
            </Button>
          </CardContent>
        </Card>

        <Card id="billing" className="scroll-mt-32">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Billing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[#6B7280]">
              Current plan:{" "}
              <Badge variant={state.plan === "FREE" ? "neutral" : "default"}>{state.plan}</Badge>
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/billing">Manage billing</Link>
            </Button>
          </CardContent>
        </Card>

        <Card id="permissions" className="scroll-mt-32 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-left text-xs text-[#6B7280]">
                    <th className="py-2 pr-3 font-medium">Capability</th>
                    {ROLES.map((role) => (
                      <th key={role} className="px-3 py-2 text-center font-medium">
                        {ROLE_LABELS[role]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((row) => (
                    <tr key={row.permission} className="border-b border-[#F0F1F3] last:border-0">
                      <td className="py-2 pr-3 text-[#111111]">{row.label}</td>
                      {ROLES.map((role) =>
                        can(role, row.permission) ? (
                          <td key={role} className="px-3 py-2 text-center">
                            <Check className="mx-auto h-4 w-4 text-[#16A34A]" />
                          </td>
                        ) : (
                          <td key={role} className="px-3 py-2 text-center">
                            <Minus className="mx-auto h-4 w-4 text-[#E5E7EB]" />
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-[#6B7280]">
              Members can only edit records assigned to them. Roles are managed on the Team page.
            </p>
          </CardContent>
        </Card>

        <Card id="data" className="scroll-mt-32">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-[#F8F9FA] px-2 py-3">
                <p className="text-xl font-semibold text-[#111111]">{state.applications.length}</p>
                <p className="text-xs text-[#6B7280]">Apps</p>
              </div>
              <div className="rounded-lg bg-[#F8F9FA] px-2 py-3">
                <p className="text-xl font-semibold text-[#111111]">{state.tableCount}</p>
                <p className="text-xs text-[#6B7280]">Tables</p>
              </div>
              <div className="rounded-lg bg-[#F8F9FA] px-2 py-3">
                <p className="text-xl font-semibold text-[#111111]">
                  {state.totalRecords.toLocaleString()}
                </p>
                <p className="text-xs text-[#6B7280]">Records</p>
              </div>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link href="/data">Browse all data</Link>
            </Button>
          </CardContent>
        </Card>

        <Card id="security" className="scroll-mt-32">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[#6B7280]">
              {state.sessionTotal} active session{state.sessionTotal === 1 ? "" : "s"}.
            </p>
            <ul className="space-y-2">
              {state.sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[#111111]">
                      {session.userAgent ? session.userAgent.slice(0, 48) : "Unknown device"}
                      {session.current && (
                        <Badge variant="neutral" className="ml-2">
                          This device
                        </Badge>
                      )}
                    </span>
                    <span className="block text-xs text-[#6B7280]">
                      {session.ipAddress ?? "Unknown IP"} ·{" "}
                      {new Date(session.createdAt).toLocaleDateString("en-US", {
                        dateStyle: "medium",
                      })}
                    </span>
                  </span>
                  {!session.current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={revoking === session.id}
                      onClick={() => revokeSession(session.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {state.sessionTotal > 1 && (
              <Button
                variant="secondary"
                size="sm"
                disabled={revoking === "all"}
                loading={revoking === "all"}
                onClick={signOutOthers}
              >
                Sign out other sessions
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {state.applications.length === 0 && (
              <EmptyState
                title="No applications yet."
                description="Upload your first spreadsheet and we'll turn it into an internal app."
              />
            )}
            {state.applications.map((app) => (
              <div
                key={app.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-[#E5E7EB] px-3 py-2.5"
              >
                <Input
                  value={appNames[app.id] ?? app.name}
                  onChange={(e) => setAppNames((prev) => ({ ...prev, [app.id]: e.target.value }))}
                  disabled={!state.canManage}
                  className="h-8 max-w-[240px] text-sm"
                />
                <Badge variant={app.status === "READY" ? "success" : "warning"}>{app.status}</Badge>
                <span className="text-xs text-[#6B7280]">
                  {app.tableCount} tables · {app.recordCount} records
                </span>
                <span className="ml-auto flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!state.canManage || renaming === app.id}
                    loading={renaming === app.id}
                    onClick={() => renameApp(app.id)}
                  >
                    Rename
                  </Button>
                  <Button
                    variant="dangerGhost"
                    size="sm"
                    disabled={!state.canManage}
                    onClick={() => setDeleteTarget(app)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-[#F5C66B] lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delete account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[#6B7280]">
              Permanently deletes your account, your workspaces with no other
              members, and all of their apps and records. This cannot be undone.
            </p>
            <Button
              variant="dangerGhost"
              size="sm"
              onClick={() => setDeleteAccountOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete my account and data
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteAccountOpen}
        onOpenChange={(open) => !open && setDeleteAccountOpen(false)}
        title="Delete your account?"
        description="Your account and every workspace without other members — including all apps, records, and uploaded files metadata — will be permanently deleted."
        confirmLabel="Delete everything"
        loading={deleteAccountLoading}
        onConfirm={deleteAccount}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? "application"}?`}
        description="All tables, records and settings for this app will be permanently deleted."
        confirmLabel="Delete app"
        loading={deleteLoading}
        onConfirm={deleteApp}
      />
    </div>
  );
}
