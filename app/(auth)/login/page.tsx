"use client";

import { errorText } from "@/lib/errors";
import { parsePositive } from "@/lib/num";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resetStore } from "@/lib/store";
import { dailyHoursOf, WorkScheduleFields, type WorkSchedule } from "@/components/mesai/work-schedule";
import { HoursChips } from "@/components/mesai/hours-chips";
import { FormSection, NumberRow, PercentRow, SwitchRow } from "@/components/mesai/ios-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

/** Supabase'in İngilizce hata mesajlarını Türkçeleştirir. */
function trError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-posta veya şifre hatalı.";
  if (m.includes("email not confirmed")) return "E-postan henüz doğrulanmamış. Gelen kutundaki bağlantıya tıkla.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.";
  if (m.includes("password should be at least")) return "Şifre en az 6 karakter olmalı.";
  if (m.includes("rate limit") || m.includes("too many")) return "Çok fazla deneme yapıldı, biraz bekleyip tekrar dene.";
  if (m.includes("invalid email") || m.includes("unable to validate email")) return "Geçerli bir e-posta gir.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Bağlantı kurulamadı. İnternetini kontrol et.";
  return errorText({ message }, "İşlem başarısız, tekrar dene");
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [role, setRole] = useState<"employee" | "manager">("employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [info, setInfo] = useState("");
  const [forgot, setForgot] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [sched, setSched] = useState<WorkSchedule>({
    work_start: "08:00", work_end: "16:00", has_shift: false, shift_type: "day",
  });
  const [pay, setPay] = useState<Pay>({
    monthly_salary: "", hourly_rate: "", included_overtime_hours: "", weekday_percent: 150, sunday_percent: 100, holiday_percent: 200, sick_leave_unpaid: false,
  });
  const [shortcutHours, setShortcutHours] = useState<number[]>([2.5, 6.5]);

  async function sendReset() {
    setBusy(true); setMsg(""); setInfo("");
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return setMsg(trError(error.message));
    setInfo("Bu e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Gelen kutunu (ve spam'i) kontrol et.");
  }

  async function resendConfirmation() {
    setBusy(true); setMsg(""); setInfo("");
    const { error } = await createClient().auth.resend({ type: "signup", email });
    setBusy(false);
    if (error) return setMsg(trError(error.message));
    setInfo("Doğrulama e-postası tekrar gönderildi.");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (forgot) return sendReset();
    if (mode === "up" && role === "employee" && step === 1) return setStep(2);
    setBusy(true);
    setMsg(""); setInfo(""); setUnconfirmed(false);
    const supabase = createClient();
    const { error, data } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: name, role,
                ...(role === "employee" && {
                  daily_hours: dailyHoursOf(sched) || 8, has_shift: sched.has_shift,
                  shift_type: sched.has_shift ? sched.shift_type : "",
                  work_start: sched.work_start, work_end: sched.work_end,
                  shortcut_hours: shortcutHours.join(","),
                  monthly_salary: parsePositive(pay.monthly_salary), hourly_rate: parsePositive(pay.hourly_rate),
                  weekday_percent: pay.weekday_percent, sunday_percent: pay.sunday_percent, holiday_percent: pay.holiday_percent,
                  included_overtime_hours: Math.min(200, parsePositive(pay.included_overtime_hours)), sick_leave_unpaid: pay.sick_leave_unpaid,
                }),
              },
            },
          });
    setBusy(false);
    if (error) {
      setUnconfirmed(error.message.toLowerCase().includes("email not confirmed"));
      return setMsg(trError(error.message));
    }
    if (mode === "up" && !data.session) {
      setUnconfirmed(true);
      return setInfo("Doğrulama e-postası gönderdik. Bağlantıya tıkladıktan sonra giriş yapabilirsin.");
    }
    resetStore();
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center gap-6 p-5">
      <div className="text-center">
        <div className="glass mx-auto mb-4 grid size-16 place-items-center text-primary">
          <Clock className="size-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Mesai</h1>
        <p className="text-muted-foreground">Mesaini, hedefini ve gelirini tek yerde takip et.</p>
      </div>
      <Card>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {forgot ? (
              <>
                <div>
                  <p className="font-semibold">Şifreni sıfırla</p>
                  <p className="text-xs text-muted-foreground">E-postanı yaz, sana yeni şifre belirleme bağlantısı gönderelim.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </>
            ) : mode === "up" && step === 2 && role === "employee" ? (
              <WorkStep
                sched={sched} setSched={setSched} pay={pay} setPay={setPay}
                shortcutHours={shortcutHours} setShortcutHours={setShortcutHours}
              />
            ) : (
            <>
            {mode === "up" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {(["employee", "manager"] as const).map((r) => (
                    <Button key={r} type="button" variant={role === r ? "default" : "secondary"} onClick={() => setRole(r)}>
                      {r === "employee" ? "Çalışan" : "Yönetici"}
                    </Button>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Ad Soyad</Label>
                  <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">Şifre</Label>
              <Input id="pw" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            </>
            )}
            {mode === "in" && !forgot && (
              <button type="button" className="w-full text-right text-xs text-muted-foreground" onClick={() => { setForgot(true); setMsg(""); setInfo(""); }}>
                Şifremi unuttum
              </button>
            )}
            {msg && <p role="alert" className="text-sm text-destructive">{msg}</p>}
            {info && <p role="status" className="text-sm text-primary">{info}</p>}
            {unconfirmed && email && !forgot && (
              <button type="button" className="w-full text-sm text-primary underline-offset-4 hover:underline" onClick={resendConfirmation} disabled={busy}>
                Doğrulama e-postasını tekrar gönder
              </button>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {forgot ? "Sıfırlama bağlantısı gönder" : mode === "in" ? "Giriş yap" : role === "employee" && step === 1 ? "Devam" : "Kayıt ol"}
            </Button>
            {forgot && (
              <button type="button" className="w-full text-sm text-muted-foreground" onClick={() => { setForgot(false); setMsg(""); setInfo(""); }}>← Girişe dön</button>
            )}
            {!forgot && mode === "up" && step === 2 && (
              <button type="button" className="w-full text-sm text-muted-foreground" onClick={() => setStep(1)}>← Geri</button>
            )}
            {!forgot && (
              <button type="button" className="w-full text-sm text-muted-foreground" onClick={() => { setMode(mode === "in" ? "up" : "in"); setStep(1); setMsg(""); setInfo(""); setUnconfirmed(false); }}>
                {mode === "in" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
              </button>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

type Pay = {
  monthly_salary: string; hourly_rate: string; included_overtime_hours: string;
  weekday_percent: number; sunday_percent: number; holiday_percent: number; sick_leave_unpaid: boolean;
};

function WorkStep({ sched, setSched, pay, setPay, shortcutHours, setShortcutHours }: {
  sched: WorkSchedule; setSched: (s: WorkSchedule) => void;
  pay: Pay; setPay: (p: Pay) => void;
  shortcutHours: number[]; setShortcutHours: (h: number[]) => void;
}) {
  const set = <K extends keyof Pay>(k: K, v: Pay[K]) => setPay({ ...pay, [k]: v });
  return (
    <>
      <div>
        <p className="font-semibold">Çalışma bilgilerin</p>
        <p className="text-xs text-muted-foreground">Hesaplamalar bu bilgilere göre yapılır, sonra ayarlardan değiştirebilirsin.</p>
      </div>
      <WorkScheduleFields value={sched} onChange={setSched} idPrefix="su" />
      <FormSection tone="muted" title="Maaş" footer="Bordrondaki net rakamları gir; bilmiyorsan boş bırakıp sonra ayarlardan doldurabilirsin.">
        <NumberRow label="Aylık net maaş" suffix="₺" value={pay.monthly_salary} onChange={(v) => set("monthly_salary", v)} />
        <NumberRow label="Maaşa dahil mesai" suffix="saat" placeholder="10.5" hint="Maaşın belli saat mesai içeriyorsa" value={pay.included_overtime_hours} onChange={(v) => set("included_overtime_hours", v)} />
        <SwitchRow label="Raporlu günler maaştan düşer" checked={pay.sick_leave_unpaid} onChange={(v) => set("sick_leave_unpaid", v)} />
      </FormSection>
      <FormSection tone="muted" title="Mesai ücreti">
        <NumberRow label="Saatlik ücret (%100)" suffix="₺" value={pay.hourly_rate} onChange={(v) => set("hourly_rate", v)} />
        <PercentRow label="Hafta içi mesai" value={pay.weekday_percent} onChange={(v) => set("weekday_percent", v)} />
        <PercentRow label="Pazar mesaisi" value={pay.sunday_percent} onChange={(v) => set("sunday_percent", v)} />
        <PercentRow label="Resmi tatil mesaisi" value={pay.holiday_percent} onChange={(v) => set("holiday_percent", v)} />
      </FormSection>
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">Sık yaptığın mesailer</p>
          <p className="text-xs text-muted-foreground">Ana sayfada tek dokunuşla eklemek için (örn. 2.5, 6.5 saat).</p>
        </div>
        <HoursChips
          items={shortcutHours.map((h) => ({ key: String(h), hours: h }))}
          onAdd={(h) => setShortcutHours([...shortcutHours, h])}
          onRemove={(k) => setShortcutHours(shortcutHours.filter((h) => String(h) !== k))}
        />
      </div>
    </>
  );
}
