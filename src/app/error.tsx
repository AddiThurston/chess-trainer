"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <h1 className="font-heading text-4xl">Something broke.</h1>
      <p className="mt-3 text-muted-foreground">{error.message || "The page could not finish loading."}</p>
      <Button className="mt-6 min-h-11" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
