"use client";

import { Bell, Moon, Sun, SunMoon } from "lucide-react";
import { setPrefs, usePrefs, type ThemePref } from "@/lib/prefs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const THEMES: { key: ThemePref; label: string; icon: typeof Sun }[] = [
  { key: "light", label: "Açık", icon: Sun },
  { key: "dark", label: "Koyu", icon: Moon },
  { key: "system", label: "Sistem", icon: SunMoon },
];

/** Profil sayfası: tema seçimi ve akşam hatırlatıcısı (bu cihaza özel). */
export function AppearanceCard() {
  const p = usePrefs();
  return (
    <Card>
      <CardHeader><CardTitle>Görünüm ve hatırlatıcı</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 rounded-full bg-muted p-1" role="radiogroup" aria-label="Tema">
          {THEMES.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" role="radio" aria-checked={p.theme === key} onClick={() => setPrefs({ theme: key })}
              className={`flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition ${p.theme === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              <Icon className="size-4" />{label}
            </button>
          ))}
        </div>
        <label className="flex min-h-12 items-center justify-between gap-3 text-sm font-medium">
          <span className="flex items-center gap-2.5">
            <Bell className="size-5 text-muted-foreground" />
            <span>
              Akşam hatırlatıcısı
              <span className="block text-xs font-normal text-muted-foreground">Mesai yaptıysan eklemeyi hatırlatır; yapmadıysan kayıt girmen gerekmez</span>
            </span>
          </span>
          <Switch checked={p.reminderOn} onCheckedChange={(v) => setPrefs({ reminderOn: v })} />
        </label>
        {p.reminderOn && (
          <label className="flex items-center justify-between gap-3 text-sm font-medium">
            Saat
            <select value={p.reminderHour} onChange={(e) => setPrefs({ reminderHour: Number(e.target.value) })}
              className="h-11 rounded-[var(--r-md)] bg-muted px-4 text-sm font-medium outline-none" aria-label="Hatırlatma saati">
              {[17, 18, 19, 20, 21, 22, 23].map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00 sonrası</option>)}
            </select>
          </label>
        )}
      </CardContent>
    </Card>
  );
}
