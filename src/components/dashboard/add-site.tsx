"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddSite() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not add site");
        return;
      }
      toast.success(`Added ${data.domain}`);
      setDomain("");
      setOpen(false);
      router.push(`/dashboard/${data.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add site
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <Input
        autoFocus
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="example.com"
        className="w-48"
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Adding…" : "Add"}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
