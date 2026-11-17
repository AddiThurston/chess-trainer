"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/import", label: "Import" },
  { href: "/admin/chapters", label: "Chapters" },
  { href: "/admin/authors", label: "Authors" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname.startsWith(link.href) ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center border-b-2 px-4 font-semibold",
            pathname.startsWith(link.href)
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
