"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function UnlockReportButton({ reportId }: { reportId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ reportId })
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Could not start checkout.");
        return;
      }

      window.location.href = payload.url;
    } catch {
      setError("Network error starting checkout.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={handleCheckout} disabled={isLoading} className="btn-primary disabled:opacity-60">
        {isLoading ? "Redirecting..." : "Unlock Full Report - $9"}
      </button>
      {error && <p className="text-sm text-rose-700">{error}</p>}
    </div>
  );
}
