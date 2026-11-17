"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export const fieldClass = "min-h-11 w-full rounded-lg border border-input bg-background px-3";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      const data = (await response.json()) as { ok: boolean; message?: string };
      if (!data.ok) {
        setError(data.message ?? "Sign-in failed.");
        return;
      }
      router.push("/courses");
      router.refresh();
    } catch {
      setError("The server did not answer. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-sm flex-col gap-4 px-4 py-16">
      <h1 className="font-heading text-4xl font-extrabold">Sign in</h1>
      <label className="flex flex-col gap-1 text-sm">
        Username
        <input name="username" autoComplete="username" required className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input name="password" type="password" autoComplete="current-password" required className={fieldClass} />
      </label>
      {error ? <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm">{error}</p> : null}
      <Button type="submit" className="h-11" disabled={busy}>
        Sign in
      </Button>
    </form>
  );
}
