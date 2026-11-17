"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resetStore } from "@/lib/store";
import { hoursBetween } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

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
  const [w, setW] = useState({
    daily_hours: "8", has_shift: false, shift_start: "08:00", shift_end: "17:00",
    monthly_salary: "", hourly_rate: "", sunday_rate: "", holiday_rate: "",
  });
  const setWork = (patch: Partial<typeof w>) => setW((cur) => {
    const next = { ...cur, ...patch };
    // Vardiya açıksa günlük çalışma saati vardiyadan hesaplanır
    if (next.has_shift && next.shift_start && next.shift_end && ("shift_start" in patch || "shift_end" in patch || "has_shift" in patch)) {
      next.daily_hours = String(hoursBetween(next.shift_start, next.shift_end));
    }
    return next;
  });

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
                  daily_hours: Number(w.daily_hours) || 8, has_shift: w.has_shift,
                  shift_start: w.has_shift ? w.shift_start : "", shift_end: w.has_shift ? w.shift_end : "",
                  monthly_salary: Number(w.monthly_salary) || 0, hourly_rate: Number(w.hourly_rate) || 0,
                  sunday_rate: Number(w.sunday_rate) || 0, holiday_rate: Number(w.holiday_rate) || 0,
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
              <WorkStep w={w} setWork={setWork} />
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

type Work = {
  daily_hours: string; has_shift: boolean; shift_start: string; shift_end: string;
  monthly_salary: string; hourly_rate: string; sunday_rate: string; holiday_rate: string;
};

function WorkStep({ w, setWork }: { w: Work; setWork: (p: Partial<Work>) => void }) {
  const num = (k: keyof Work, label: string, hint?: string, placeholder = "0") => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type="number" inputMode="decimal" min="0" step="0.01" placeholder={placeholder}
        value={String(w[k])} onChange={(e) => setWork({ [k]: e.target.value })} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  const doubled = Number(w.hourly_rate) > 0 ? String(Number(w.hourly_rate) * 2) : "0";
  return (
    <>
      <div>
        <p className="font-semibold">Çalışma bilgilerin</p>
        <p className="text-xs text-muted-foreground">Hesaplamalar bu bilgilere göre yapılır, sonra değiştirebilirsin.</p>
      </div>
      <label className="flex items-center justify-between text-sm">
        Vardiyalı çalışıyorum
        <Switch checked={w.has_shift} onCheckedChange={(v) => setWork({ has_shift: v })} />
      </label>
      {w.has_shift && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label htmlFor="ss">Vardiya başlangıç</Label>
            <Input id="ss" type="time" required value={w.shift_start} onChange={(e) => setWork({ shift_start: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="se">Vardiya bitiş</Label>
            <Input id="se" type="time" required value={w.shift_end} onChange={(e) => setWork({ shift_end: e.target.value })} /></div>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="dh">Günlük normal çalışma saati</Label>
        <Input id="dh" type="number" inputMode="decimal" min="0.5" max="24" step="0.25" required
          value={w.daily_hours} onChange={(e) => setWork({ daily_hours: e.target.value })} readOnly={w.has_shift} />
        {w.has_shift && <p className="text-xs text-muted-foreground">Vardiya saatlerinden hesaplandı.</p>}
      </div>
      {num("monthly_salary", "Aylık maaş (₺)")}
      <div className="grid grid-cols-2 gap-3">
        {num("hourly_rate", "Saatlik mesai ücreti (₺)")}
        {num("sunday_rate", "Pazar saatlik (₺)", undefined, doubled)}
      </div>
      {num("holiday_rate", "Resmi tatil saatlik (₺)", "Pazar/tatil boş kalırsa saatlik ücretin 2 katı hesaplanır.", doubled)}
    </>
  );
}
