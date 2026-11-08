"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Calculator, Home, Target, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const employee = [
  { href: "/", label: "Ana sayfa", icon: Home },
  { href: "/calendar", label: "Takvim", icon: CalendarDays },
  { href: "/goal", label: "Hedef", icon: Target },
  { href: "/finance", label: "Hesap", icon: Calculator },
  { href: "/profile", label: "Profil", icon: User },
];
const manager = [
  { href: "/manager", label: "Ekip", icon: Users },
  { href: "/profile", label: "Profil", icon: User },
];

export function BottomNav({ role }: { role: string }) {
  const path = usePathname();
  const items = role === "manager" ? manager : employee;
  return (
    <nav className="glass fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md justify-around p-2">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href}
            className={cn("flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium transition",
              active ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground")}>
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
