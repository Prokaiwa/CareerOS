import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerOS",
  description: "Local-first career management. Your data, your machine.",
};

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/brain", label: "Career Brain" },
  { href: "/jobs", label: "Jobs" },
  { href: "/board", label: "Board" },
  { href: "/resumes", label: "Resumes" },
  { href: "/coach", label: "Coach" },
  { href: "/contacts", label: "Contacts" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <aside className="w-56 shrink-0 border-r border-stone-200 bg-white px-4 py-6">
            <Link href="/" className="block px-2 text-lg font-bold tracking-tight">
              Career<span className="text-emerald-600">OS</span>
            </Link>
            <p className="mt-1 px-2 text-[11px] text-stone-400">
              local-first · your data
            </p>
            <nav className="mt-6 space-y-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="min-w-0 flex-1 px-8 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
