import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminDenied() {
  return (
    <div className="mx-auto max-w-xl py-10">
      <h1 className="font-heading text-3xl font-extrabold">This part is for the admin.</h1>
      <p className="mt-3 text-muted-foreground">Sign in with the admin account to import and manage courses.</p>
      <Link href="/signin" className={cn(buttonVariants(), "mt-6 h-11 px-4")}>
        Sign in
      </Link>
    </div>
  );
}
