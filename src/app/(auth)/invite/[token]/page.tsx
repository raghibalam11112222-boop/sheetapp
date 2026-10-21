import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/guards";
import { AcceptInviteButton } from "./accept-button";

export const metadata = {
  title: "Accept invitation",
  description: "Join a SheetApp workspace.",
};

function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now();
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getSession();
  if (!session?.user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const invitation = await prisma.invitation.findUnique({ where: { token } });
  const org = invitation ? await prisma.organization.findUnique({ where: { id: invitation.organizationId } }) : null;

  const invalid =
    !invitation ||
    invitation.status !== "PENDING" ||
    invitation.email.toLowerCase() !== session.user.email.toLowerCase() ||
    isExpired(invitation.expiresAt);

  if (invalid || !org) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-[#111111]">
          Invitation unavailable
        </h1>
        <p className="text-sm text-[#6B7280]">
          {invitation && invitation.status !== "PENDING"
            ? "This invitation has already been used or revoked."
            : "This invitation link is invalid or has expired."}
        </p>
        <Link href="/dashboard" className="text-sm font-medium text-[#111111] hover:underline">
          Go to your workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-xl font-semibold tracking-tight text-[#111111]">Join {org.name}</h1>
      <p className="text-sm text-[#6B7280]">
        You&apos;ve been invited as <span className="font-medium">{invitation.role}</span>. Accept
        to start working in this workspace.
      </p>
      <AcceptInviteButton token={token} />
    </div>
  );
}
