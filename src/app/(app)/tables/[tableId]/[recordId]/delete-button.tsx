"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteRecordAction } from "@/actions/records";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";

export function DeleteRecordButton({
  tableId,
  recordId,
}: {
  tableId: string;
  recordId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    setLoading(true);
    const result = await deleteRecordAction(recordId);
    setLoading(false);
    setOpen(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Record deleted");
    router.push(`/tables/${tableId}`);
    router.refresh();
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete record?"
        description="This permanently removes the record. This cannot be undone."
        confirmLabel="Delete"
        loading={loading}
        onConfirm={onDelete}
      />
    </>
  );
}
