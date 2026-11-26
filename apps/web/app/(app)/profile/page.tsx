"use client";

import { rotationLabel, validRotation } from "@mesai/core/shift";
import Link from "next/link";
import { BadgeDollarSign, Bell, Briefcase, ChevronRight, CircleHelp, Clock, DatabaseBackup, FileText, Palette, UserRound, Users, Zap } from "lucide-react";
import { useLinks, useProfile, useSettings, useShortcuts } from "@/lib/store";
import { usePrefs } from "@/lib/prefs";
import { money } from "@mesai/core/calc";
import { SHIFTS } from "@mesai/core/types";
import { Page } from "@/components/mesai/page";
import { SettingsGroup, SettingsRow } from "@/components/mesai/settings-list";
import { InstallCard } from "@/components/mesai/install-card";
import { THEME_LABEL } from "@/components/mesai/appearance-card";

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toLocaleUpperCase("tr")).join("") || "?";

/** Ayarlar: iOS Ayarlar uygulaması gibi gruplanmış satırlar, her biri kendi alt sayfasına kayarak açılır. */
export default function SettingsPage() {
  const profile = useProfile();
  const settings = useSettings();
  const shortcuts = useShortcuts();
  const links = useLinks();
  const prefs = usePrefs();

  if (!profile) return <div className="glass min-h-96 w-full animate-pulse" aria-busy />;
  const employee = profile.role === "employee";
  const pending = (links ?? []).filter((l) => l.status === "pending").length;
  const linked = (links ?? []).filter((l) => l.status === "accepted").length;
  const s = settings;

  return (
    <Page title="Ayarlar">
      <div className="max-w-2xl space-y-7">
        <Link href="/profile/account" transitionTypes={["nav-forward"]}
          className="settings-row flex items-center gap-4 rounded-[var(--r-lg)] bg-card p-4 shadow-[var(--shadow-soft),0_0_0_0.5px_var(--hairline)]">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--teal)] to-[var(--navy)] text-2xl font-semibold text-white shadow-inner dark:to-[var(--ink)]">
            {initials(profile.full_name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[22px] font-semibold leading-tight">{profile.full_name || "Adını ekle"}</span>
            <span className="text-[15px] text-muted-foreground">{employee ? "Çalışan" : "Yönetici"} · Hesap ve gizlilik</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground/60" aria-hidden />
        </Link>

        <InstallCard />

        {employee && (
          <SettingsGroup title="Çalışma">
            <SettingsRow href="/profile/work" icon={Clock} color="#3b82c4" label="Çalışma saati"
              value={s ? (s.has_shift && validRotation(s.shift_rotation) ? rotationLabel(validRotation(s.shift_rotation)!) : !s.work_start || !s.work_end ? "Ayarlanmadı"
                : (s.has_shift && s.shift_type ? `${SHIFTS[s.shift_type].label} · ` : "") + `${s.work_start.slice(0, 5)}–${s.work_end.slice(0, 5)}` + ((s.saturday_off ?? true) ? "" : " · 6 gün")) : undefined} />
            <SettingsRow href="/profile/pay" icon={BadgeDollarSign} color="#2f9e6e" label="Ücret ve hedef"
              value={s ? (s.monthly_salary > 0 ? money(s.monthly_salary, s.currency) : "Ayarlanmadı") : undefined} />
            <SettingsRow href="/profile/shortcuts" icon={Zap} color="#e08a3c" label="Mesai kısayolları"
              value={shortcuts ? `${shortcuts.length}` : undefined} />
          </SettingsGroup>
        )}

        {employee && (
          <SettingsGroup title="Paylaşım">
            <SettingsRow href="/profile/manager" icon={Users} color="#7a6fd6" label="Yöneticim"
              value={pending ? `${pending} istek` : linked ? "Bağlı" : "Yok"} />
          </SettingsGroup>
        )}

        <SettingsGroup title="Uygulama">
          <SettingsRow href="/profile/appearance" icon={Palette} color="#d86a9a" label="Görünüm" value={THEME_LABEL[prefs.theme]} />
          {employee && <SettingsRow href="/profile/appearance" icon={Bell} color="#e0603c" label="Hatırlatıcı" value={prefs.reminderOn ? `${String(prefs.reminderHour).padStart(2, "0")}:00` : "Kapalı"} />}
          <SettingsRow href="/profile/data" icon={DatabaseBackup} color="#4a5d78" label="Yedekle ve geri yükle" />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow href="/profile/account" icon={employee ? UserRound : Briefcase} color="#7f8f9c" label="Hesap" />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow href="/support" icon={CircleHelp} color="#3b82c4" label="Yardım ve destek" />
          <SettingsRow href="/privacy" icon={FileText} color="#6b7d8f" label="Gizlilik politikası" />
          <SettingsRow href="/terms" icon={FileText} color="#6b7d8f" label="Kullanım koşulları" />
        </SettingsGroup>

        <p className="pb-2 text-center text-[13px] text-muted-foreground">Mesai · verilerin yalnızca senin hesabında saklanır</p>
      </div>
    </Page>
  );
}
