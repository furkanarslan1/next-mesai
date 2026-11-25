"use client";

import { InstallCard } from "@/components/mesai/install-card";
import { authErrorText as trError, dailyHoursOf, DEFAULT_SCHEDULE, DEFAULT_SHORTCUT_HOURS, DEFAULT_SIGNUP_PAY, SIGNUP_STEPS, signupData, type SignupPay as Pay } from "@mesai/core/auth";
import { hrs } from "@mesai/core/calc";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resetStore } from "@/lib/store";
import { WorkScheduleFields, type WorkSchedule } from "@/components/mesai/work-schedule";
import { HoursChips } from "@/components/mesai/hours-chips";
import { FormSection, NumberRow, PercentRow, Segmented, SwitchRow } from "@/components/mesai/ios-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sched, setSched] = useState<WorkSchedule>(DEFAULT_SCHEDULE);
  const [pay, setPay] = useState<Pay>(DEFAULT_SIGNUP_PAY);
  const [shortcutHours, setShortcutHours] = useState<number[]>(DEFAULT_SHORTCUT_HOURS);

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
    // Çalışan kaydı 3 adım: hesap → çalışma düzeni → ücret ve hedef
    if (mode === "up" && role === "employee" && step < SIGNUP_STEPS) { setMsg(""); setStep((step + 1) as 2 | 3); window.scrollTo({ top: 0 }); return; }
    setBusy(true);
    setMsg(""); setInfo(""); setUnconfirmed(false);
    const supabase = createClient();
    const { error, data } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: signupData({ name, role, sched, pay, shortcutHours }) },
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
            ) : mode === "up" && step === 3 && role === "employee" ? (
              <PayStep pay={pay} setPay={setPay} dailyHours={dailyHoursOf(sched) || 8} />
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
              {forgot ? "Sıfırlama bağlantısı gönder" : mode === "in" ? "Giriş yap" : role === "employee" && step < SIGNUP_STEPS ? "Devam" : "Kayıt ol"}
            </Button>
            {!forgot && mode === "up" && step === 1 && (
              <p className="text-center text-xs text-muted-foreground">
                Kayıt olarak <a href="/terms" target="_blank" className="underline">Kullanım Koşulları</a>’nı kabul etmiş olursun. Verilerinin nasıl işlendiği{" "}
                <a href="/privacy" target="_blank" className="underline">Gizlilik Politikası ve KVKK Aydınlatma Metni</a>’nde.
              </p>
            )}
            {forgot && (
              <button type="button" className="w-full text-sm text-muted-foreground" onClick={() => { setForgot(false); setMsg(""); setInfo(""); }}>← Girişe dön</button>
            )}
            {!forgot && mode === "up" && step > 1 && (
              <button type="button" className="w-full text-sm text-muted-foreground" onClick={() => { setMsg(""); setStep((step - 1) as 1 | 2); }}>← Geri</button>
            )}
            {!forgot && (
              <button type="button" className="w-full text-sm text-muted-foreground" onClick={() => { setMode(mode === "in" ? "up" : "in"); setStep(1); setMsg(""); setInfo(""); setUnconfirmed(false); }}>
                {mode === "in" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
              </button>
            )}
          </form>
        </CardContent>
      </Card>
      {/* Siteye ilk gelen de uygulamayı kurabilsin: iPhone'da ana ekrana ekleme, Android'de APK / yükle */}
      <InstallCard />
    </main>
  );
}


/** Adım başlığı: "Adım 2 / 3" ve açıklama */
function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">Adım {n} / {SIGNUP_STEPS}</p>
      <p className="font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">Hesaplamalar bu bilgilere göre yapılır; bilmediklerini boş bırakıp sonra Ayarlar&apos;dan değiştirebilirsin.</p>
    </div>
  );
}

/** 2. adım: çalışma düzeni (Ayarlar → Çalışma saati, Kısayollar ve yıllık izin hakkı) */
function WorkStep({ sched, setSched, pay, setPay, shortcutHours, setShortcutHours }: {
  sched: WorkSchedule; setSched: (s: WorkSchedule) => void;
  pay: Pay; setPay: (p: Pay) => void;
  shortcutHours: number[]; setShortcutHours: (h: number[]) => void;
}) {
  const set = <K extends keyof Pay>(k: K, v: Pay[K]) => setPay({ ...pay, [k]: v });
  return (
    <>
      <StepTitle n={2} title="Çalışma düzenin" />
      <WorkScheduleFields value={sched} onChange={setSched} idPrefix="su" />
      <FormSection tone="muted" title="Çalışma günleri" footer={pay.saturday_off
        ? "Haftada 5 gün: cumartesi ve pazar tatil."
        : "Haftada 6 gün: cumartesi normal iş günü, yalnızca pazar tatil."}>
        <SwitchRow label="Cumartesi tatil" hint="İş yerinde cumartesi çalışılmıyorsa açık bırak" checked={pay.saturday_off} onChange={(v) => set("saturday_off", v)} />
      </FormSection>
      <FormSection tone="muted" title="Yıllık izin" footer="Yasal asgari hak: 1–5 yıl 14 gün, 5–15 yıl 20 gün, 15 yıl ve üzeri 26 gün.">
        <NumberRow label="Yıllık izin hakkı" suffix="gün" inputMode="numeric" placeholder="14" value={pay.annual_leave_days} onChange={(v) => set("annual_leave_days", v.replace(/\D/g, "").slice(0, 2))} />
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

/** 3. adım: ücret ve hedef (Ayarlar → Ücret ve hedef ile aynı alanlar) */
function PayStep({ pay, setPay, dailyHours }: { pay: Pay; setPay: (p: Pay) => void; dailyHours: number }) {
  const set = <K extends keyof Pay>(k: K, v: Pay[K]) => setPay({ ...pay, [k]: v });
  return (
    <>
      <StepTitle n={3} title="Ücret ve hedef" />
      <FormSection tone="muted" title="Maaş" footer="Bordrondaki net rakamları gir. Maaşa dahil mesai yoksa boş bırak; örneğin maaşın 10,5 saat mesai içeriyorsa 10,5 yaz.">
        <NumberRow label="Aylık net maaş" suffix="₺" value={pay.monthly_salary} onChange={(v) => set("monthly_salary", v)} />
        <NumberRow label="Maaşa dahil mesai" suffix="saat" hint="Maaşın içerdiği mesai saati" value={pay.included_overtime_hours} onChange={(v) => set("included_overtime_hours", v)} />
        <SwitchRow label="Raporlu günler maaştan düşer" hint="Bordroda “Raporlu (Ücretsiz)” varsa aç" checked={pay.sick_leave_unpaid} onChange={(v) => set("sick_leave_unpaid", v)} />
        <SwitchRow label="Raporlu günler mesaiden düşer" hint={`Her raporlu gün için ${hrs(dailyHours)} mesaiden düşülür`} checked={pay.sick_deducts_overtime} onChange={(v) => set("sick_deducts_overtime", v)} />
      </FormSection>
      <FormSection tone="muted" title="Mesai ücreti">
        <NumberRow label="Saatlik ücret (%100)" suffix="₺" hint="Bordrodaki “Ek. Mes. %100” ücreti" value={pay.hourly_rate} onChange={(v) => set("hourly_rate", v)} />
        <PercentRow label="Hafta içi mesai" value={pay.weekday_percent} onChange={(v) => set("weekday_percent", v)} />
        <PercentRow label="Pazar mesaisi" value={pay.sunday_percent} onChange={(v) => set("sunday_percent", v)} />
        <PercentRow label="Resmi tatil mesaisi" value={pay.holiday_percent} onChange={(v) => set("holiday_percent", v)} />
      </FormSection>
      <details className="group rounded-[var(--r-lg)] bg-muted">
        <summary className="flex min-h-[3.25rem] cursor-pointer list-none items-center justify-between px-4 text-[15px] font-medium">
          Sabit saatlik ücretler (isteğe bağlı)
          <span className="text-muted-foreground transition group-open:rotate-90" aria-hidden>›</span>
        </summary>
        <div className="border-t border-border/60 [&>*+*]:border-t [&>*+*]:border-border/60">
          <NumberRow label="Pazar saatlik" suffix="₺" placeholder="Orandan hesapla" value={pay.sunday_rate} onChange={(v) => set("sunday_rate", v)} />
          <NumberRow label="Resmi tatil saatlik" suffix="₺" placeholder="Orandan hesapla" value={pay.holiday_rate} onChange={(v) => set("holiday_rate", v)} />
          <p className="px-4 py-3 text-xs text-muted-foreground">Doldurursan o gün tipinde oran yerine bu sabit ücret kullanılır.</p>
        </div>
      </details>
      <FormSection tone="muted" title="Aylık hedef" footer="İstersen boş bırak; ana sayfadan sonra da belirleyebilirsin.">
        <div className="p-3">
          <Segmented label="Hedef türü" value={pay.goal_mode} onChange={(m) => set("goal_mode", m)}
            options={[{ value: "amount", label: "Hedef maaş" }, { value: "hours", label: "Mesai saati" }]} />
        </div>
        {pay.goal_mode === "amount"
          ? <NumberRow label="Toplam kazanç" suffix="₺" placeholder="Örn. 60000" hint="Maaş + mesai kazancı" value={pay.monthly_goal_amount} onChange={(v) => set("monthly_goal_amount", v)} />
          : <NumberRow label="Mesai" suffix="saat" placeholder="Örn. 40" hint="Ayda yapmak istediğin" value={pay.monthly_goal_hours} onChange={(v) => set("monthly_goal_hours", v)} />}
      </FormSection>
    </>
  );
}
