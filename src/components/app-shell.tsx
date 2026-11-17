"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Crown, Library, Puzzle, Swords, Upload } from "lucide-react";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

const links = [
  { href: "/courses", label: "Courses", icon: Library },
  { href: "/openings", label: "Sprints", icon: BookOpen },
  { href: "/endgames", label: "Endgames", icon: Crown },
  { href: "/tactics", label: "Tactics", icon: Puzzle },
  { href: "/play", label: "Play", icon: Swords },
];

type SessionUser = { username: string; isAdmin: boolean };

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="var(--primary)" />
        <path
          d="M9 23V16m0 0V9m0 7h7m0 0 7-7m-7 7 7 7"
          fill="none"
          stroke="var(--primary-foreground)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-heading text-2xl font-extrabold tracking-tight">{SITE_NAME}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data: { user?: SessionUser | null }) => {
        if (!cancel) setUser(data.user ?? null);
      })
      .catch(() => {
        if (!cancel) setUser(null);
      });
    return () => {
      cancel = true;
    };
  }, [pathname]);

  async function signOut() {
    await fetch("/api/auth/session", { method: "DELETE" });
    setUser(null);
    router.refresh();
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const adminLink = user?.isAdmin ? (
    <Link href="/admin/import" aria-label="Import and manage courses" className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground lg:hidden">
      <Upload className="size-5" />
    </Link>
  ) : null;
  const account = user ? (
    <button type="button" onClick={signOut} className="min-h-11 rounded-lg px-3 text-sm text-muted-foreground hover:text-foreground">
      Sign out {user.username}
    </button>
  ) : (
    <Link href="/signin" className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-sidebar-accent">
      Sign in
    </Link>
  );

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar px-3 py-5 lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 font-semibold",
                isActive(link.href)
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <link.icon className={cn("size-5", isActive(link.href) && "text-primary")} />
              {link.label}
            </Link>
          ))}
          {user?.isAdmin ? (
            <Link
              href="/admin/import"
              aria-current={isActive("/admin") ? "page" : undefined}
              className={cn(
                "mt-4 flex min-h-11 items-center gap-3 rounded-lg px-3 font-semibold",
                isActive("/admin")
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Upload className="size-5" />
              Import
            </Link>
          ) : null}
        </nav>
        {account}
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-2 lg:hidden">
        <Brand />
        <div className="flex items-center">
          {adminLink}
          {account}
        </div>
      </header>

      <main className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold",
              isActive(link.href) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <link.icon className="size-5" />
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
