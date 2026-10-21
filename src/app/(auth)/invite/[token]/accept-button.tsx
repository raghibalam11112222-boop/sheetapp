"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { acceptInvitationAction } from "@/actions/team";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function accept() {
    setLoading(true);
    const result = await acceptInvitationAction(token);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("You've joined the workspace");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Button className="w-full" onClick={accept} loading={loading}>
      Accept invitation
    </Button>
  );
}
