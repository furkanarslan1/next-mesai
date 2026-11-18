"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resetStore } from "@/lib/store";
import { dailyHoursOf, WorkScheduleFields, type WorkSchedule } from "@/components/mesai/work-schedule";
import { HoursChips } from "@/components/mesai/hours-chips";
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
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [sched, setSched] = useState<WorkSchedule>({
    work_start: "08:00", work_end: "16:00", has_shift: false, shift_type: "day",
  });
  const [pay, setPay] = useState({ monthly_salary: "", hourly_rate: "", sunday_rate: "", holiday_rate: "" });
  const [shortcutHours, setShortcutHours] = useState<number[]>([2.5, 6.5]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "up" && role === "employee" && step === 1) return setStep(2);
    setBusy(true);
    setMsg("");
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
                  monthly_salary: Number(pay.monthly_salary) || 0, hourly_rate: Number(pay.hourly_rate) || 0,
                  sunday_rate: Number(pay.sunday_rate) || 0, holiday_rate: Number(pay.holiday_rate) || 0,
                }),
              },
            },
          });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (mode === "up" && !data.session) return setMsg("E-postanı doğrulayıp giriş yapabilirsin.");
    resetStore();
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-5">
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
            {mode === "up" && step === 2 && role === "employee" ? (
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
            {msg && <p className="text-sm text-destructive">{msg}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "in" ? "Giriş yap" : role === "employee" && step === 1 ? "Devam" : "Kayıt ol"}
            </Button>
            {mode === "up" && step === 2 && (
              <button type="button" className="w-full text-sm text-muted-foreground" onClick={() => setStep(1)}>← Geri</button>
            )}
            <button type="button" className="w-full text-sm text-muted-foreground" onClick={() => { setMode(mode === "in" ? "up" : "in"); setStep(1); setMsg(""); }}>
              {mode === "in" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

type Pay = { monthly_salary: string; hourly_rate: string; sunday_rate: string; holiday_rate: string };

function WorkStep({ sched, setSched, pay, setPay, shortcutHours, setShortcutHours }: {
  sched: WorkSchedule; setSched: (s: WorkSchedule) => void;
  pay: Pay; setPay: (p: Pay) => void;
  shortcutHours: number[]; setShortcutHours: (h: number[]) => void;
}) {
  const num = (k: keyof Pay, label: string, hint?: string, placeholder = "0") => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type="number" inputMode="decimal" min="0" step="0.01" placeholder={placeholder}
        value={pay[k]} onChange={(e) => setPay({ ...pay, [k]: e.target.value })} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  const doubled = Number(pay.hourly_rate) > 0 ? String(Number(pay.hourly_rate) * 2) : "0";
  return (
    <>
      <div>
        <p className="font-semibold">Çalışma bilgilerin</p>
        <p className="text-xs text-muted-foreground">Hesaplamalar bu bilgilere göre yapılır, sonra ayarlardan değiştirebilirsin.</p>
      </div>
      <WorkScheduleFields value={sched} onChange={setSched} idPrefix="su" />
      {num("monthly_salary", "Aylık maaş (₺)")}
      <div className="grid grid-cols-2 gap-3">
        {num("hourly_rate", "Saatlik mesai ücreti (₺)")}
        {num("sunday_rate", "Pazar saatlik (₺)", undefined, doubled)}
      </div>
      {num("holiday_rate", "Resmi tatil saatlik (₺)", "Pazar/tatil boş kalırsa saatlik ücretin 2 katı hesaplanır.", doubled)}
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
