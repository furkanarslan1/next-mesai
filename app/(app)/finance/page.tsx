"use client";

import { useCallback, useEffect, useState } from "react";
import { addMonths, format, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { useMesai } from "@/lib/use-data";
import { useToday } from "@/lib/now";
import { money, monthSummary } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Item { id: string; kind: "income" | "expense"; category: string; amount: number }
const EXPENSE_PRESETS = ["Kira", "Yakıt", "Elektrik", "Su", "Doğalgaz", "İnternet", "Telefon", "Market", "Kredi/Kart"];
const INCOME_PRESETS = ["Maaş", "Ek gelir"];

export default function FinancePage() {
  const today = useToday();
  if (!today) return <div className="glass min-h-[28rem] w-full animate-pulse" aria-busy />;
  return <FinanceView today={today} />;
}

function FinanceView({ today }: { today: Date }) {
  const [month, setMonth] = useState(startOfMonth(today));
  const { entries, settings } = useMesai(month);
  const [items, setItems] = useState<Item[]>([]);
  const [cat, setCat] = useState("");
  const [amount, setAmount] = useState("");
  const m = format(month, "yyyy-MM-dd");

  const load = useCallback(async () => {
    const { data } = await createClient().from("finance_items").select("*").eq("month", m);
    setItems((data ?? []).map((d) => ({ ...d, amount: Number(d.amount) })) as Item[]);
  }, [m]);
  useEffect(() => { load(); }, [load]);

  async function add(kind: Item["kind"], category: string, amt: number) {
    if (!category || !(amt >= 0)) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("finance_items").insert({ user_id: user!.id, month: m, kind, category, amount: amt });
    setCat(""); setAmount(""); load();
  }
  const overtime = monthSummary(entries, settings).earned;
  const income = items.filter((i) => i.kind === "income").reduce((a, i) => a + i.amount, 0) + overtime;
  const expense = items.filter((i) => i.kind === "expense").reduce((a, i) => a + i.amount, 0);
  const net = income - expense;
  const cur = settings.currency;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="secondary" size="sm" onClick={() => setMonth(addMonths(month, -1))}>←</Button>
        <h1 className="text-xl font-bold capitalize">{format(month, "MMMM yyyy", { locale: tr })}</h1>
        <Button variant="secondary" size="sm" onClick={() => setMonth(addMonths(month, 1))}>→</Button>
      </div>
      <Card><CardContent className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground">Gelir − Gider</p>
        <p className={`text-3xl font-bold ${net < 0 ? "text-destructive" : "text-emerald-500"}`}>{money(net, cur)}</p>
        <p className="text-xs text-muted-foreground">Gelir {money(income, cur)} (mesai {money(overtime, cur)}) · Gider {money(expense, cur)}</p>
      </CardContent></Card>

      <Card><CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {EXPENSE_PRESETS.map((p) => <Button key={p} size="sm" variant={cat === p ? "default" : "secondary"} onClick={() => setCat(p)}>{p}</Button>)}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Kategori" value={cat} onChange={(e) => setCat(e.target.value)} />
          <Input type="number" placeholder="Tutar" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => add("expense", cat, +amount)}>Gider ekle</Button>
          <Button variant="outline" onClick={() => add("income", cat || INCOME_PRESETS[0], +amount)}>Gelir ekle</Button>
        </div>
      </CardContent></Card>

      <div className="space-y-2">
        {items.map((i) => (
          <div key={i.id} className="glass flex items-center justify-between px-4 py-3 text-sm">
            <span>{i.category}</span>
            <span className="flex items-center gap-3">
              <b className={i.kind === "income" ? "text-emerald-500" : ""}>{i.kind === "income" ? "+" : "−"}{money(i.amount, cur)}</b>
              <button className="text-destructive" onClick={async () => { await createClient().from("finance_items").delete().eq("id", i.id); load(); }}>✕</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
