import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <h1 className="font-heading text-4xl">That page is not on the board.</h1>
      <p className="mt-3 text-muted-foreground">The link does not match an opening, an ending, or a mode.</p>
      <Link href="/" className={cn(buttonVariants(), "mt-6 min-h-11")}>
        Back to the dashboard
      </Link>
    </div>
  );
}
