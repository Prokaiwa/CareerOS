"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteContactButton({ contactId, contactName }: { contactId: number; contactName: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete ${contactName || "this contact"}? This also deletes their interaction history.`)) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "Failed to delete contact");
        return;
      }
      router.push("/contacts");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={submitting}
      className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {submitting ? "Deleting..." : "Delete contact"}
    </button>
  );
}
