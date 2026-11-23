"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Calculator, Home, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/store";
import { haptic } from "@/lib/haptics";
import "@/lib/install"; // kurulum isteğini sayfa açılır açılmaz yakalamak için

const employee = [
  { href: "/", label: "Ana sayfa", icon: Home },
  { href: "/calendar", label: "Takvim", icon: CalendarDays },
  { href: "/finance", label: "Hesap", icon: Calculator },
  { href: "/reports", label: "Rapor", icon: BarChart3 },
  { href: "/profile", label: "Ayarlar", icon: Settings },
];
const manager = [
  { href: "/manager", label: "Ekip", icon: Users },
  { href: "/profile", label: "Ayarlar", icon: Settings },
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
      <aside style={{ viewTransitionName: "side-bar" }} className="glass-nav sticky top-6 hidden h-[calc(100dvh-3rem)] w-56 shrink-0 flex-col gap-1 p-3 md:flex xl:fixed xl:left-6">
        <div className="mb-4 flex items-center gap-2.5 px-2 pt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="size-9 rounded-[0.6rem] shadow-sm" />
          <span className="text-lg font-bold tracking-tight">Mesai</span>
        </div>
        {items.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} transitionTypes={["nav-tab"]} aria-current={isActive(href) ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition",
              isActive(href) ? "nav-active" : "text-muted-foreground hover:bg-primary/5 hover:text-foreground")}>
            <Icon className="size-5" />{label}
          </Link>
        ))}
      </aside>

      {/* Telefonda alt şerit: menünün çevresindeki boşluğa (köşeler, kenar aralıkları) dokunmak arkadaki
          butonlara (2.5 saat gibi) geçmesin diye tam genişlikte, dokunmayı yutan bir kalkan */}
      <div className="nav-shield fixed inset-x-0 bottom-0 z-30 md:hidden" aria-hidden />
      <nav style={{ viewTransitionName: "tab-bar" }} className="glass-nav fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md touch-manipulation justify-around p-2 md:hidden">
        {items.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} transitionTypes={["nav-tab"]} aria-current={isActive(href) ? "page" : undefined}
            aria-label={label} onClick={() => { if (!isActive(href)) haptic(); }}
            className={cn("flex flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium transition",
              "flex-1",
              isActive(href) ? "nav-active" : "text-muted-foreground")}>
            <Icon className="size-[22px]" strokeWidth={isActive(href) ? 2.4 : 2} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
