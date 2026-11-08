"use client";

import { useCallback, useEffect, useState } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { download, toCSV } from "@/lib/backup";
import { hhmm, hrs } from "@/lib/calc";
import { TYPE_META, type Entry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Emp { id: string; full_name: string; entries: Entry[] }

export default function ManagerPage() {
  const [emps, setEmps] = useState<Emp[]>([]);
  const [code, setCode] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: links } = await supabase.from("manager_links").select("employee_id").eq("status", "accepted");
    const ids = (links ?? []).map((l) => l.employee_id);
    if (!ids.length) return setEmps([]);
    const from = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const to = format(endOfMonth(new Date()), "yyyy-MM-dd");
    const [{ data: ps }, { data: es }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", ids),
      supabase.from("entries").select("*").in("user_id", ids).gte("work_date", from).lte("work_date", to),
    ]);
    setEmps((ps ?? []).map((p) => ({ ...p, entries: ((es ?? []) as Entry[]).filter((e) => e.user_id === p.id) })));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function invite() {
    const { data } = await createClient().rpc("request_link", { code });
    const m: Record<string, string> = { ok: "İstek gönderildi, çalışan onaylayınca görünür.", not_found: "Kod bulunamadı.", not_manager: "Yetkin yok." };
    toast(m[data as string] ?? "Hata"); setCode("");
  }
  function exportCSV() {
    const rows = emps.flatMap((e) => e.entries.map((x) => ({ calisan: e.full_name, tarih: x.work_date, tur: TYPE_META[x.type].label, baslangic: hhmm(x.start_time), bitis: hhmm(x.end_time), saat: x.hours })));
    download(`ekip-${format(new Date(), "yyyy-MM")}.csv`, toCSV(rows), "text/csv");
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Ekip · {format(new Date(), "MMMM")}</h1>
      <Card><CardContent className="flex gap-2">
        <Input placeholder="Çalışan davet kodu" value={code} onChange={(e) => setCode(e.target.value)} />
        <Button onClick={invite}>İstek gönder</Button>
      </CardContent></Card>
      <div className="grid grid-cols-3 gap-3 text-center">
        <Card><CardContent><p className="text-xs text-muted-foreground">Çalışan</p><p className="text-xl font-bold">{emps.length}</p></CardContent></Card>
        <Card><CardContent><p className="text-xs text-muted-foreground">Toplam mesai</p><p className="text-xl font-bold">{hrs(emps.flatMap((e) => e.entries).filter((x) => x.type === "overtime" || x.type === "holiday").reduce((a, x) => a + Number(x.hours), 0))}</p></CardContent></Card>
        <Card><CardContent><p className="text-xs text-muted-foreground">Devamsızlık</p><p className="text-xl font-bold">{emps.flatMap((e) => e.entries).filter((x) => x.type === "absent").length}</p></CardContent></Card>
      </div>
      {emps.map((e) => {
        const h = e.entries.filter((x) => x.type === "overtime" || x.type === "holiday").reduce((a, x) => a + Number(x.hours), 0);
        return (
          <Card key={e.id}>
            <CardHeader><CardTitle className="flex justify-between"><span>{e.full_name}</span><span>{hrs(h)}</span></CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {(["paid_leave", "unpaid_leave", "sick", "absent"] as const).map((t) => <span key={t}>{TYPE_META[t].label}: {e.entries.filter((x) => x.type === t).length}</span>)}
              </div>
              <button className="text-primary" onClick={() => setOpen(open === e.id ? null : e.id)}>{open === e.id ? "Gizle" : "Kayıtları göster"}</button>
              {open === e.id && e.entries.sort((a, b) => a.work_date.localeCompare(b.work_date)).map((x) => (
                <div key={x.id} className="flex justify-between border-t py-1"><span>{x.work_date}</span><span>{TYPE_META[x.type].label} {x.start_time && `${hhmm(x.start_time)}–${hhmm(x.end_time)} `}{Number(x.hours) > 0 && hrs(Number(x.hours))}</span></div>
              ))}
            </CardContent>
          </Card>
        );
      })}
      {emps.length > 0 && <Button variant="secondary" className="w-full" onClick={exportCSV}>Ekibi CSV indir</Button>}
    </div>
  );
}
