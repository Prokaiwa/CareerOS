"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/brain", label: "Career Brain" },
  { href: "/import", label: "Import" },
  { href: "/jobs", label: "Jobs" },
  { href: "/board", label: "Board" },
  { href: "/analytics", label: "Analytics" },
  { href: "/resumes", label: "Resumes" },
  { href: "/coach", label: "Coach" },
  { href: "/contacts", label: "Contacts" },
  { href: "/settings", label: "Settings" },
];

/**
 * The sidebar shell around every page, except onboarding — a first-run
 * wizard showing nav links to pages with nothing in them yet would just be
 * confusing, so it renders full-bleed instead.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/onboarding")) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-stone-200 bg-white px-4 py-6">
        <Link href="/" className="block px-2 text-lg font-bold tracking-tight">
          Career<span className="text-emerald-600">OS</span>
        </Link>
        <p className="mt-1 px-2 text-[11px] text-stone-400">local-first · your data</p>
        <nav className="mt-6 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-md px-2 py-1.5 text-sm ${
                  active
                    ? "bg-stone-100 font-medium text-stone-900"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
