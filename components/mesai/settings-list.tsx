"use client";

import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

/** iOS Ayarlar grubu: başlık, beyaz yuvarlak kutu içinde ince çizgiyle ayrılmış satırlar, altta açıklama. */
export function SettingsGroup({ title, footer, children }: { title?: string; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      {title && <h2 className="px-4 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">{title}</h2>}
      <div className="overflow-hidden rounded-[var(--r-lg)] bg-card shadow-[var(--shadow-soft),0_0_0_0.5px_var(--hairline)] [&>*+*]:border-t-[0.5px] [&>*+*]:border-[var(--hairline)]">
        {children}
      </div>
      {footer && <p className="px-4 text-[13px] leading-relaxed text-muted-foreground">{footer}</p>}
    </section>
  );
}

/** Renkli kare ikonlu satır; `href` varsa alt sayfaya kayarak geçer, `onClick` varsa düğme olur. */
export function SettingsRow({ icon: Icon, color, label, value, href, onClick, destructive }: {
  icon?: LucideIcon; color?: string; label: string; value?: React.ReactNode;
  href?: string; onClick?: () => void; destructive?: boolean;
}) {
  const body = (
    <>
      {Icon && <span className="settings-icon" style={{ background: color ?? "var(--teal)" }}><Icon className="size-[18px]" strokeWidth={2.2} /></span>}
      <span className={`min-w-0 flex-1 truncate text-[17px] ${destructive ? "text-destructive" : ""}`}>{label}</span>
      {value != null && <span className="max-w-[45%] truncate text-[15px] text-muted-foreground">{value}</span>}
      {href && <ChevronRight className="size-5 shrink-0 text-muted-foreground/60" aria-hidden />}
    </>
  );
  const cls = "settings-row flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2 text-left transition-colors";
  if (href) return <Link href={href} transitionTypes={["nav-forward"]} className={cls}>{body}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{body}</button>;
}
