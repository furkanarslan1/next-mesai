"use client";

import { Moon, Sun, SunMoon } from "lucide-react";
import { setPrefs, usePrefs, type ThemePref } from "@/lib/prefs";
import { FormRow, FormSection, Segmented, SwitchRow } from "@/components/mesai/ios-form";

export const THEME_LABEL: Record<ThemePref, string> = { light: "Açık", dark: "Koyu", system: "Sistem" };
const THEME_ICON = { light: Sun, dark: Moon, system: SunMoon };

/** Görünüm (tema) ve akşam hatırlatıcısı: bu cihaza özel tercihler. */
export function AppearanceSettings() {
  const p = usePrefs();
  return (
    <div className="space-y-6">
      <FormSection title="Tema" footer="Sistem: iPhone'un açık/koyu ayarını izler.">
        <div className="p-3">
          <Segmented label="Tema" value={p.theme} onChange={(t) => setPrefs({ theme: t })}
            options={(["light", "dark", "system"] as ThemePref[]).map((t) => ({ value: t, label: THEME_LABEL[t] }))} />
        </div>
        <div className="flex justify-center gap-6 py-4" aria-hidden>
          {(["light", "dark", "system"] as ThemePref[]).map((t) => {
            const Icon = THEME_ICON[t];
            return <Icon key={t} className={`size-6 transition ${p.theme === t ? "text-[var(--tint)] scale-110" : "text-muted-foreground/40"}`} />;
          })}
        </div>
      </FormSection>
      <FormSection title="Hatırlatıcı" footer="Uygulama açıkken, ayarladığın saatten sonra o güne kayıt girmediysen hatırlatır.">
        <SwitchRow label="Akşam hatırlatıcısı" checked={p.reminderOn} onChange={(v) => setPrefs({ reminderOn: v })} />
        {p.reminderOn && (
          <FormRow label="Saat">
            <select value={p.reminderHour} onChange={(e) => setPrefs({ reminderHour: Number(e.target.value) })}
              className="h-11 rounded-full bg-muted px-4 text-[16px] font-semibold outline-none" aria-label="Hatırlatma saati">
              {[17, 18, 19, 20, 21, 22, 23].map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00 sonrası</option>)}
            </select>
          </FormRow>
        )}
      </FormSection>
    </div>
  );
}
