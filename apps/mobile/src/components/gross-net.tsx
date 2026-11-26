import { money } from "@mesai/core/calc";
import { parseNum } from "@mesai/core/num";
import { grossToNet, grossToNetYear, netToGross, taxYearFor } from "@mesai/core/tax";
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { radius, useColors } from "@/theme";
import { Dialog } from "./dialog";
import { Segmented } from "./form";
import { Button, Txt } from "./ui";

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

/** Brüt ↔ net hesaplayıcı (web: GrossNetDialog). Net aydan aya değişir; bu ayın neti maaş olarak yazılabilir. */
export function GrossNetDialog({ open, onClose, today, onApply }: {
  open: boolean; onClose: () => void; today: Date; onApply: (net: number) => void;
}) {
  const c = useColors();
  const [mode, setMode] = useState<"gross" | "net">("gross");
  const [value, setValue] = useState("");
  const [showYear, setShowYear] = useState(false);
  const year = today.getFullYear(), month = today.getMonth() + 1;
  const v = Math.max(0, parseNum(value) || 0);
  const gross = mode === "gross" ? v : netToGross(v, year, month);
  const cur = gross > 0 ? grossToNet(gross, year, month) : null;
  const rows = cur ? [
    ["Brüt", money(cur.gross)],
    ["SGK işçi payı (%14)", `−${money(cur.sgk)}`],
    ["İşsizlik sigortası (%1)", `−${money(cur.unemployment)}`],
    [`Gelir vergisi (dilim %${Math.round(cur.rate * 100)})`, `−${money(cur.incomeTax)}`],
    ["Damga vergisi", `−${money(cur.stampTax)}`],
  ] : [];

  return (
    <Dialog open={open} onClose={onClose} title="Brüt ↔ net maaş"
      description={`${taxYearFor(year)} bordro parametreleriyle yaklaşık hesap (SGK, işsizlik, gelir ve damga vergisi, asgari ücret istisnası).`}>
      <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
        <Segmented value={mode} onChange={(m) => { setMode(m); setValue(""); }}
          options={[{ value: "gross", label: "Brüt giriyorum" }, { value: "net", label: "Net giriyorum" }]} />
        <View style={{ gap: 6 }}>
          <Txt style={{ fontSize: 14, lineHeight: 14, fontWeight: "500" }}>{mode === "gross" ? "Aylık brüt maaş" : `${MONTHS[month - 1]} ayı net maaş`}</Txt>
          <TextInput maxFontSizeMultiplier={1.35} value={value} onChangeText={(t) => setValue(t.replace(/[^0-9.,]/g, ""))} keyboardType="decimal-pad" autoFocus
            placeholder="Örn. 50000" placeholderTextColor={c.mutedForeground}
            style={{ height: 44, borderRadius: radius.md, backgroundColor: c.muted, paddingHorizontal: 16, fontSize: 16, color: c.foreground }} />
        </View>
        {cur ? (
          <>
            <View style={{ borderRadius: radius.md, backgroundColor: c.muted, paddingHorizontal: 12 }}>
              {rows.map(([k, val], i) => (
                <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
                  <Txt muted style={{ fontSize: 14, lineHeight: 18, flexShrink: 1 }}>{k}</Txt>
                  <Txt style={{ fontSize: 14, lineHeight: 18, fontVariant: ["tabular-nums"] }}>{val}</Txt>
                </View>
              ))}
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border }}>
                <Txt style={{ fontSize: 14, lineHeight: 18, fontWeight: "600" }}>{MONTHS[month - 1]} ayı net</Txt>
                <Txt style={{ fontSize: 14, lineHeight: 18, fontWeight: "700", color: c.tint, fontVariant: ["tabular-nums"] }}>{money(cur.net)}</Txt>
              </View>
            </View>
            <Button title="Bu ayın netini maaş olarak yaz" size="lg" onPress={() => { onApply(cur.net); onClose(); }} />
            <Pressable onPress={() => setShowYear(!showYear)} hitSlop={6}>
              <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>{showYear ? "▾" : "▸"} Yıl boyunca net (vergi dilimi yükseldikçe düşer)</Txt>
            </Pressable>
            {showYear ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {grossToNetYear(gross, year).map((r) => (
                  <View key={r.month} style={{ width: "31.5%", borderRadius: radius.md, paddingVertical: 6, alignItems: "center", backgroundColor: c.muted, borderWidth: r.month === month ? 1 : 0, borderColor: c.tint }}>
                    <Txt muted style={{ fontSize: 11, lineHeight: 14 }}>{MONTHS[r.month - 1]}</Txt>
                    <Txt style={{ fontSize: 12, lineHeight: 16, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{money(r.net)}</Txt>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Dialog>
  );
}
