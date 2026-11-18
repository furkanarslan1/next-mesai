"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Calculator, Clock, Home, Target, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/store";
import "@/lib/install"; // kurulum isteğini sayfa açılır açılmaz yakalamak için

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

/** Telefonda alttaki cam çubuk, geniş ekranda soldaki cam kenar çubuğu. */
export function BottomNav() {
  const path = usePathname();
  const profile = useProfile();
  // Rol gelene kadar çalışan menüsü (sabit boyut) gösterilir; yönetici ilk açılışta bile kaymasın diye rol saklanır
  const items = profile?.role === "manager" ? manager : employee;
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      <aside className="glass-nav sticky top-6 hidden h-[calc(100dvh-3rem)] w-56 shrink-0 flex-col gap-1 p-3 md:flex xl:fixed xl:left-6">
        <div className="mb-4 flex items-center gap-2.5 px-2 pt-1">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30"><Clock className="size-5" /></span>
          <span className="text-lg font-bold tracking-tight">Mesai</span>
        </div>
        {items.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
              isActive(href) ? "nav-active" : "text-muted-foreground hover:bg-white/5 hover:text-foreground")}>
            <Icon className="size-5" />{label}
          </Link>
        ))}
      </aside>

      {/* Telefonda alt şerit: menünün çevresindeki boşluğa (köşeler, kenar aralıkları) dokunmak arkadaki
          butonlara (2.5 saat gibi) geçmesin diye tam genişlikte, dokunmayı yutan bir kalkan */}
      <div className="nav-shield fixed inset-x-0 bottom-0 z-30 md:hidden" aria-hidden />
      <nav className="glass-nav fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md touch-manipulation justify-around p-2 md:hidden">
        {items.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}
            className={cn("flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium transition",
              isActive(href) ? "nav-active" : "text-muted-foreground")}>
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
