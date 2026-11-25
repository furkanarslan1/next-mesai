"use client";

import { useState } from "react";
import { parseNum } from "@mesai/core/num";
import { money } from "@mesai/core/calc";
import { grossToNet, grossToNetYear, netToGross, taxYearFor } from "@mesai/core/tax";
import { Segmented } from "@/components/mesai/ios-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

/**
 * Brüt ↔ net hesaplayıcı (Ücret sayfası). Gelir vergisi yıl içinde kümülatif olduğu için net aydan aya değişir:
 * bu ayın neti maaş olarak yazılabilir, yılın tablosu altta görünür.
 */
export function GrossNetDialog({ open, onOpenChange, today, onApply }: {
  open: boolean; onOpenChange: (o: boolean) => void; today: Date;
  /** Bu ayın netini maaş alanına yazar */
  onApply: (net: number) => void;
}) {
  const [mode, setMode] = useState<"gross" | "net">("gross");
  const [value, setValue] = useState("");
  const year = today.getFullYear(), month = today.getMonth() + 1;
  const v = Math.max(0, parseNum(value) || 0);
  const gross = mode === "gross" ? v : netToGross(v, year, month);
  const cur = gross > 0 ? grossToNet(gross, year, month) : null;
  const yearRows = gross > 0 ? grossToNetYear(gross, year) : [];
  const usedYear = taxYearFor(year);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Brüt ↔ net maaş</DialogTitle>
          <DialogDescription>{usedYear} bordro parametreleriyle yaklaşık hesap (SGK, işsizlik, gelir ve damga vergisi, asgari ücret istisnası).</DialogDescription>
        </DialogHeader>
        <Segmented label="Girdiğin tutar" value={mode} onChange={(m) => { setMode(m); setValue(""); }}
          options={[{ value: "gross", label: "Brüt giriyorum" }, { value: "net", label: "Net giriyorum" }]} />
        <div className="space-y-1.5">
          <Label htmlFor="gn-v">{mode === "gross" ? "Aylık brüt maaş" : `${MONTHS[month - 1]} ayı net maaş`}</Label>
          <Input id="gn-v" inputMode="decimal" autoFocus value={value} placeholder="Örn. 50000"
            onChange={(e) => setValue(e.target.value.replace(/[^0-9.,]/g, ""))} />
        </div>
        {cur && (
          <div className="space-y-3">
            <dl className="divide-y divide-border/60 r-md bg-muted px-3 text-sm tabular-nums">
              {[
                ["Brüt", money(cur.gross)],
                ["SGK işçi payı (%14)", `−${money(cur.sgk)}`],
                ["İşsizlik sigortası (%1)", `−${money(cur.unemployment)}`],
                [`Gelir vergisi (dilim %${Math.round(cur.rate * 100)})`, `−${money(cur.incomeTax)}`],
                ["Damga vergisi", `−${money(cur.stampTax)}`],
              ].map(([k, val]) => (
                <div key={k} className="flex justify-between gap-3 py-2"><dt className="text-muted-foreground">{k}</dt><dd>{val}</dd></div>
              ))}
              <div className="flex justify-between gap-3 py-2.5 font-semibold"><dt>{MONTHS[month - 1]} ayı net</dt><dd className="text-[var(--tint)]">{money(cur.net)}</dd></div>
            </dl>
            <Button className="h-12 w-full text-base font-semibold" onClick={() => { onApply(cur.net); onOpenChange(false); }}>
              Bu ayın netini maaş olarak yaz
            </Button>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Yıl boyunca net (vergi dilimi yükseldikçe düşer)</summary>
              <div className="mt-2 grid grid-cols-3 gap-1.5 tabular-nums">
                {yearRows.map((r) => (
                  <div key={r.month} className={`r-md px-2 py-1.5 text-center ${r.month === month ? "bg-primary/15 ring-1 ring-primary/30" : "bg-muted"}`}>
                    <p className="text-[11px] text-muted-foreground">{MONTHS[r.month - 1]}</p>
                    <p className="text-xs font-semibold">{money(r.net)}</p>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
