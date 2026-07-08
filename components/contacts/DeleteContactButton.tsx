"use client";

import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

export function DeleteContactButton({ contactId, contactName }: { contactId: number; contactName: string }) {
  const router = useRouter();

  async function handleDelete() {
    const res = await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to delete contact");
    }
    router.push("/contacts");
    router.refresh();
  }

  return (
    <ConfirmButton
      onConfirm={handleDelete}
      prompt={`Delete ${contactName || "this contact"}? This also deletes their interaction history.`}
      confirmLabel="Delete"
      triggerLabel="Delete contact"
      triggerClassName="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
    />
  );
}
