"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/openings", label: "Openings" },
  { href: "/endgames", label: "Endgames" },
  { href: "/tactics", label: "Tactics" },
  { href: "/play", label: "Play" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="group flex items-baseline gap-3">
          <span className="font-heading text-xl tracking-tight text-foreground">Chess Trainer</span>
          <span className="text-xs tracking-wide text-muted-foreground uppercase">addithurston.com</span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "min-h-11 shrink-0 rounded-lg px-3 py-2 text-sm",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
