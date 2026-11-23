"use client";

import { errorText } from "@mesai/core/errors";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // E-postadaki bağlantı ?code=... ile gelir; oturuma çevrilince yeni şifre girilebilir
  useEffect(() => {
    const supabase = createClient();
    const code = new URLSearchParams(window.location.search).get("code");
    (async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) return setStatus("invalid");
        window.history.replaceState(null, "", "/reset-password");
      }
      const { data: { session } } = await supabase.auth.getSession();
      setStatus(session ? "ready" : "invalid");
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) return setMsg("Şifreler aynı değil.");
    setBusy(true); setMsg("");
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg(error.message.toLowerCase().includes("different") ? "Yeni şifre eskisinden farklı olmalı." : errorText(error, "Şifre güncellenemedi, tekrar dene"));
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center gap-6 p-5">
      <div className="text-center">
        <div className="glass mx-auto mb-4 grid size-16 place-items-center text-primary"><KeyRound className="size-8" /></div>
        <h1 className="text-2xl font-bold tracking-tight">Yeni şifre belirle</h1>
      </div>
      <Card>
        <CardContent>
          {status === "checking" && <p className="text-sm text-muted-foreground" aria-busy>Bağlantı doğrulanıyor…</p>}
          {status === "invalid" && (
            <div className="space-y-3 text-sm">
              <p className="text-destructive">Bu bağlantı geçersiz ya da süresi dolmuş.</p>
              <Button className="w-full" onClick={() => router.replace("/login")}>Girişe dön ve yeni bağlantı iste</Button>
            </div>
          )}
          {status === "ready" && (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pw">Yeni şifre</Label>
                <Input id="pw" type="password" minLength={6} required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw2">Şifre (tekrar)</Label>
                <Input id="pw2" type="password" minLength={6} required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </div>
              {msg && <p role="alert" className="text-sm text-destructive">{msg}</p>}
              <Button type="submit" className="w-full" disabled={busy}>Şifreyi kaydet</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
