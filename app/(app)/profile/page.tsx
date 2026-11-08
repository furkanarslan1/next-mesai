"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { download, toCSV } from "@/lib/backup";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Link { id: string; status: string; manager_id: string; employee_id: string; name?: string }

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<Link[]>([]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
    setProfile(p as Profile);
    const { data: l } = await supabase.from("manager_links").select("*").eq(p?.role === "manager" ? "manager_id" : "employee_id", user!.id);
    const ids = (l ?? []).map((x) => (p?.role === "manager" ? x.employee_id : x.manager_id));
    const { data: names } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
    setLinks((l ?? []).map((x) => ({ ...x, name: names?.find((n) => n.id === (p?.role === "manager" ? x.employee_id : x.manager_id))?.full_name })));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function respond(id: string, status: "accepted" | "revoked") {
    await createClient().from("manager_links").update({ status }).eq("id", id);
    load();
  }
  async function backup(format: "json" | "csv") {
    const supabase = createClient();
    const tables = profile?.role === "manager" ? ["manager_links"] : ["user_settings", "shortcuts", "entries", "finance_items"];
    const data: Record<string, unknown[]> = {};
    for (const t of tables) data[t] = (await supabase.from(t).select("*")).data ?? [];
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "json") download(`mesai-yedek-${stamp}.json`, JSON.stringify(data, null, 2), "application/json");
    else for (const t of tables) if (data[t].length) download(`mesai-${t}-${stamp}.csv`, toCSV(data[t] as Record<string, unknown>[]), "text/csv");
    toast.success("Yedek indirildi");
  }

  if (!profile) return null;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{profile.full_name}</h1>
      {profile.role === "employee" && (
        <Card>
          <CardHeader><CardTitle>Yöneticim</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Davet kodun: <b className="select-all font-mono text-lg tracking-widest">{profile.invite_code}</b></p>
            <p className="text-muted-foreground">Yöneticin bu kodla istek gönderir; onay senin elinde. Yönetici yalnızca mesai/izin kayıtlarını görür — ücret, hedef ve gelir-gider bilgilerin gizli kalır. Yöneticin yoksa tek başına kullanabilirsin.</p>
            {links.map((l) => (
              <div key={l.id} className="glass flex items-center justify-between px-3 py-2">
                <span>{l.name || "Yönetici"} · {l.status === "accepted" ? "Bağlı" : l.status === "pending" ? "Onay bekliyor" : "İptal"}</span>
                <span className="flex gap-2">
                  {l.status === "pending" && <Button size="sm" onClick={() => respond(l.id, "accepted")}>Onayla</Button>}
                  {l.status !== "revoked" && <Button size="sm" variant="outline" onClick={() => respond(l.id, "revoked")}>{l.status === "pending" ? "Reddet" : "Erişimi kaldır"}</Button>}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Yedekle</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => backup("json")}>JSON (tam yedek)</Button>
          <Button variant="secondary" onClick={() => backup("csv")}>CSV (Excel)</Button>
        </CardContent>
      </Card>
      <Button variant="outline" className="w-full" onClick={async () => { await createClient().auth.signOut(); router.replace("/login"); router.refresh(); }}>Çıkış yap</Button>
    </div>
  );
}
