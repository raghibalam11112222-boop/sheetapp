"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Mail, Trash2, UserPlus } from "lucide-react";
import type { InvitationView, TeamMemberView } from "@/actions/team";
import {
  inviteMemberAction,
  removeMemberAction,
  resendInvitationAction,
  revokeInvitationAction,
  updateMemberRoleAction,
} from "@/actions/team";
import { ROLE_LABELS, can, type Role } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROLES = Object.keys(ROLE_LABELS) as Role[];

export function TeamView({
  state,
}: {
  state: {
    orgId: string;
    orgName: string;
    members: TeamMemberView[];
    invitations: InvitationView[];
  };
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TeamMemberView | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const myRole = state.members.find((m) => m.isYou)?.role as Role | undefined;
  const canInvite = can(myRole, "team:invite");
  const canManage = can(myRole, "team:manage");

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    const result = await inviteMemberAction(email, role);
    setInviting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setInviteLink(result.data.inviteUrl);
    setEmail("");
    toast.success("Invitation created");
    router.refresh();
  }

  async function onChangeRole(membershipId: string, nextRole: string) {
    const result = await updateMemberRoleAction(membershipId, nextRole);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Role updated");
    router.refresh();
  }

  async function onRemove() {
    if (!removeTarget) return;
    setRemoveLoading(true);
    const result = await removeMemberAction(removeTarget.id);
    setRemoveLoading(false);
    setRemoveTarget(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Member removed");
    router.refresh();
  }

  async function onRevoke(invitationId: string) {
    const result = await revokeInvitationAction(invitationId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Invitation revoked");
    router.refresh();
  }

  async function onResend(invitationId: string) {
    const result = await resendInvitationAction(invitationId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setInviteLink(result.data.inviteUrl);
    toast.success("Invitation resent with a fresh link");
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-left text-xs text-[#6B7280]">
                    <th className="py-2 pr-3 font-medium">Person</th>
                    <th className="py-2 pr-3 font-medium">Role</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Joined</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {state.members.map((member) => (
                    <tr key={member.id} className="border-b border-[#F0F1F3] last:border-0">
                      <td className="py-2.5 pr-3">
                        <span className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F8F9FA] text-[11px] font-semibold text-[#111111]">
                            {member.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span>
                            <span className="block font-medium text-[#111111]">
                              {member.name}
                              {member.isYou && (
                                <span className="ml-1 text-[11px] text-[#6B7280]">(you)</span>
                              )}
                            </span>
                            <a
                              href={`mailto:${member.email}`}
                              className="block text-xs text-[#6B7280] hover:text-[#111111] hover:underline"
                            >
                              {member.email}
                            </a>
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        {canManage && !member.isYou ? (
                          <select
                            value={member.role}
                            onChange={(e) => onChangeRole(member.id, e.target.value)}
                            className="h-8 rounded-md border border-[#E5E7EB] bg-white px-2 text-sm"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant={member.role === "ADMIN" ? "default" : "neutral"}>
                            {ROLE_LABELS[member.role as Role] ?? member.role}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge variant="success">Active</Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-[#6B7280]">
                        {new Date(member.joinedAt).toLocaleDateString("en-US", {
                          dateStyle: "medium",
                        })}
                      </td>
                      <td className="py-2.5 text-right">
                        {canManage && !member.isYou && (
                          <button
                            type="button"
                            onClick={() => setRemoveTarget(member)}
                            className="rounded p-1 text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#DC2626]"
                            aria-label={`Remove ${member.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {state.invitations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending invitations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {state.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 text-[#111111]">
                    <Mail className="h-3.5 w-3.5 text-[#6B7280]" />
                    <a
                      href={`mailto:${invitation.email}`}
                      className="hover:underline"
                    >
                      {invitation.email}
                    </a>
                    <Badge variant="neutral">{invitation.role}</Badge>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-[#6B7280]">
                      expires{" "}
                      {new Date(invitation.expiresAt).toLocaleDateString("en-US", {
                        dateStyle: "medium",
                      })}
                    </span>
                    {canManage && (
                      <Button variant="ghost" size="sm" onClick={() => onResend(invitation.id)}>
                        Resend
                      </Button>
                    )}
                    {canManage && (
                      <Button variant="ghost" size="sm" onClick={() => onRevoke(invitation.id)}>
                        Revoke
                      </Button>
                    )}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {canInvite && (
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <UserPlus className="h-4 w-4" /> Invite teammate
            </CardTitle>
          </CardHeader>
        <CardContent>
          <form onSubmit={onInvite} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="flex h-9 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm focus:border-[#111111] focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#6B7280]">
                {role === "ADMIN"
                  ? "Full access including billing and team."
                  : role === "MANAGER"
                    ? "CRUD records, exports and workflows."
                    : role === "MEMBER"
                      ? "Can create and edit records."
                      : "Read-only access to records."}
              </p>
            </div>
            <Button type="submit" className="w-full" loading={inviting}>
              Create invitation
            </Button>
          </form>

          {inviteLink && (
            <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] p-3">
              <p className="text-xs font-medium text-[#111111]">Share this link</p>
              <p className="mt-1 break-all text-xs text-[#6B7280]">{inviteLink}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  toast.success("Link copied");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove member?"
        description={`${removeTarget?.name} will immediately lose access to this workspace.`}
        confirmLabel="Remove"
        loading={removeLoading}
        onConfirm={onRemove}
      />
    </div>
  );
}
