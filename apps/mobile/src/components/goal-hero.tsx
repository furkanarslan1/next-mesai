import { goalProgress, hrs, money, monthSummary, num, saat } from "@mesai/core/calc";
import { daysToPayday, summaryDetails } from "@mesai/core/summary";
import { addMonths } from "date-fns/addMonths";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { errorText } from "@mesai/core/errors";
import { parseNum } from "@mesai/core/num";
import { projection, remainingLabel } from "@mesai/core/reports";
import type { Entry, Settings } from "@mesai/core/types";
import { Pencil, Target } from "@/components/icons";
import { useOptimistic, useState, useTransition } from "react";
import { TextInput, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { mutate, useFinance, useMonthEntries } from "@/lib/store";
import { radius, useColors } from "@/theme";
import { Dialog } from "./dialog";
import { Segmented } from "./form";
import { GoalRing } from "./goal-ring";
import { toast } from "./toast";
import Reanimated from "react-native-reanimated";
import { AnimatedNumber } from "./animated-number";
import { Celebrate, usePop, useRiseBurst } from "./celebrate";
import { Button, Card, Eyebrow, Stat, Txt } from "./ui";

/** Aylık özet (web'deki MonthSummary): toplam kazanç ve mesai saati / günü / kazancı. */
export function MonthSummary({ entries, settings, month, today }: {
  entries: Entry[]; settings: Settings;
  /** Özetin ayı (yyyy-MM): geçen ay farkı ve gelir-gider için */
  month: string;
  /** Verilirse (içinde bulunulan ay) maaş günü geri sayımı gösterilir */
  today?: Date;
}) {
  const g = goalProgress(entries, settings);
  const sum = monthSummary(entries, settings);
  const cur = settings.currency;
  const workDays = new Set(entries.filter((e) => (e.type === "overtime" || e.type === "holiday") && Number(e.hours) > 0).map((e) => e.work_date)).size;
  return (
    <View style={{ gap: 20 }}>
      <View style={{ alignItems: "center" }}>
        <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>Bu ay toplam kazanç</Txt>
        <AnimatedNumber value={g.income} format={(n) => money(n, cur)} numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 4, fontSize: 48, lineHeight: 48, fontWeight: "700", letterSpacing: -1.2 }} />
        <Txt muted style={{ marginTop: 8, fontSize: 12, lineHeight: 16, textAlign: "center", fontVariant: ["tabular-nums"] }}>
          Maaş {money(settings.monthly_salary, cur)}{g.deduction > 0 ? ` − kesinti ${money(g.deduction, cur)}` : ""} + mesai {money(g.earned, cur)}
        </Txt>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Stat label="Mesai saati" value={hrs(sum.hours)} />
        <Stat label="Mesai günü" value={`${workDays} gün`} />
        <Stat label="Mesai kazancı" value={money(sum.earned, cur)} />
      </View>
      {sum.sickHours > 0 ? <Txt muted style={{ fontSize: 12, lineHeight: 16, textAlign: "center" }}>{sum.sickDays} raporlu gün için {hrs(sum.sickHours)} mesaiden düşüldü ({hrs(sum.grossHours)} girildi)</Txt> : null}
      <SummaryDetails entries={entries} settings={settings} month={month} today={today} />
      {sum.includedHours > 0 ? (
        <Txt muted style={{ fontSize: 12, lineHeight: 16, textAlign: "center" }}>
          {hrs(sum.includedHours)} maaşa dahil · {sum.paidHours === 0 && sum.quotaLeft > 0 ? `${hrs(sum.quotaLeft)} sonra ücretli mesai başlar` : `${hrs(sum.paidHours)} ücretli mesai`}
        </Txt>
      ) : null}
    </View>
  );
}

const signed = (n: number, f: (x: number) => string) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${f(Math.abs(n))}`;

/** Özetin ayrıntıları (web: SummaryDetails): türe göre mesai, kesinti, geçen aya göre fark, gelir-gider ve maaş günü. */
function SummaryDetails({ entries, settings, month, today }: { entries: Entry[]; settings: Settings; month: string; today?: Date }) {
  const c = useColors();
  const prevKey = format(addMonths(parseISO(`${month}-01`), -1), "yyyy-MM");
  const prev = useMonthEntries(prevKey);
  const items = useFinance(month);
  const cur = settings.currency;
  const d = summaryDetails(entries, settings, prev, items);
  const payIn = today ? daysToPayday(today, settings.payday) : null;
  const showPrev = d.vsPrev && prev && prev.length > 0;
  const ded = d.deduction;
  const dedParts = [ded.unpaid && `${ded.unpaid} gün ücretsiz izin`, ded.absent && `${ded.absent} gün gelmedi`, ded.sick && `${ded.sick} gün rapor`].filter(Boolean).join(", ");
  const rows: { label: string; hint?: string; value: string; tone?: "good" | "bad" }[] = [];
  if (d.byKind.length > 1 || d.byKind.some((k) => k.kind !== "weekday")) {
    d.byKind.forEach((k) => rows.push({ label: `${k.label} mesaisi`, hint: hrs(k.hours), value: money(k.amount, cur) }));
  }
  if (ded.days > 0) rows.push({ label: "Maaş kesintisi", hint: dedParts, value: `−${money(ded.amount, cur)}`, tone: "bad" });
  if (d.finance) {
    if (d.finance.extra > 0) rows.push({ label: "Ek gelir", value: `+${money(d.finance.extra, cur)}`, tone: "good" });
    rows.push({ label: "Harcamalar", value: `−${money(d.finance.expense, cur)}` });
    rows.push({ label: "Cebinde kalan", value: money(d.finance.left, cur), tone: d.finance.left < 0 ? "bad" : "good" });
  }
  if (!rows.length && !showPrev && payIn === null) return null;
  const toneColor = (t?: "good" | "bad") => (t === "good" ? c.tint : t === "bad" ? c.destructive : c.foreground);
  const chip = { borderRadius: 999, backgroundColor: c.muted, paddingHorizontal: 12, paddingVertical: 4 };
  const small = { fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums" as const] };

  return (
    <View style={{ gap: 12 }}>
      {showPrev || payIn !== null ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
          {showPrev && d.vsPrev ? (
            <View style={chip}>
              <Txt muted style={small}>
                Geçen aya göre{" "}
                <Txt style={[small, { fontWeight: "700", color: d.vsPrev.income > 0 ? c.tint : d.vsPrev.income < 0 ? c.destructive : c.foreground }]}>{signed(d.vsPrev.income, (x) => money(x, cur))}</Txt>
                {" · "}{signed(d.vsPrev.hours, (x) => `${num(Math.round(x * 10) / 10)} saat`)}
              </Txt>
            </View>
          ) : null}
          {payIn !== null ? (
            <View style={chip}>
              {payIn === 0
                ? <Txt style={[small, { fontWeight: "700", color: c.tint }]}>Maaş bugün</Txt>
                : <Txt muted style={small}>Maaşa <Txt style={[small, { fontWeight: "700", color: c.foreground }]}>{payIn} gün</Txt></Txt>}
            </View>
          ) : null}
        </View>
      ) : null}
      {rows.length ? (
        <View style={{ borderRadius: radius.md, backgroundColor: c.muted, paddingHorizontal: 12 }}>
          {rows.map((r, i) => (
            <View key={r.label} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
              <View style={{ flexShrink: 1 }}>
                <Txt style={{ fontSize: 14, lineHeight: 18 }}>{r.label}</Txt>
                {r.hint ? <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>{r.hint}</Txt> : null}
              </View>
              <Txt style={{ fontSize: 14, lineHeight: 18, fontWeight: "600", fontVariant: ["tabular-nums"], color: toneColor(r.tone) }}>{r.value}</Txt>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Hedef kartı (web'deki GoalHero): halka, kalan, ay sonu tahmini ve hedefi düzenleme penceresi. */
export function GoalHero({ userId, settings, entries, month, monthLabel, today }: {
  userId: string; settings: Settings; entries: Entry[]; month: string; monthLabel: string; today?: Date;
}) {
  const c = useColors();
  const [opt, patchOpt] = useOptimistic(settings, (s, patch: Partial<Settings>) => ({ ...s, ...patch }));
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Settings["goal_mode"]>(settings.goal_mode);
  const [value, setValue] = useState("");

  const g = goalProgress(entries, opt);
  const pr = today ? projection(entries, opt, today) : null;
  const cur = opt.currency;
  const burst = useRiseBurst(monthLabel, g.set && g.percent >= 100 ? 1 : 0, true);
  const ringPop = usePop(burst);
  // Hedef kartında saatler uzun yazılır: "46,9 saat"
  const fmtHrs = (n: number) => saat(Math.round(n * 10) / 10);
  const fmtMoney = (n: number) => money(n, cur);

  function openEditor() {
    setMode(opt.goal_mode);
    const v = opt.goal_mode === "hours" ? opt.monthly_goal_hours : opt.monthly_goal_amount;
    setValue(v > 0 ? String(v) : "");
    setOpen(true);
  }
  function save() {
    const n = Math.max(0, parseNum(value) || 0);
    const patch: Partial<Settings> = mode === "hours" ? { goal_mode: mode, monthly_goal_hours: n } : { goal_mode: mode, monthly_goal_amount: n };
    setOpen(false);
    startTransition(async () => {
      patchOpt(patch);
      try { await mutate.saveSettings(userId, patch); haptic("success"); toast.success("Hedef güncellendi"); }
      catch (e) { toast.error(errorText(e, "Kaydedilemedi")); }
    });
  }

  const remainingMoney = Math.max(0, g.goal - g.income);
  const remainingHours = Math.max(0, g.goal - g.done);

  return (
    <Card style={{ padding: 20, gap: 20 }} accessibilityLabel="Aylık hedef">
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Eyebrow>{monthLabel} {g.set ? "hedefi" : "özeti"}</Eyebrow>
          {g.set ? <Txt style={{ marginTop: 2, fontSize: 17, lineHeight: 25.5, fontWeight: "600" }}>{g.mode === "hours" ? `${saat(g.goal)} mesai` : money(g.goal, cur)}</Txt> : null}
        </View>
        <Button size="sm" variant="secondary" onPress={openEditor} title={g.set ? "Düzenle" : "Hedef belirle"}
          icon={g.set ? <Pencil size={16} color={c.secondaryForeground} /> : <Target size={16} color={c.secondaryForeground} />} />
      </View>

      {!g.set ? (
        <View style={{ gap: 20 }}>
          <MonthSummary entries={entries} settings={opt} month={month} today={today} />
          <Txt muted style={{ fontSize: 12, lineHeight: 16, textAlign: "center" }}>Hedef belirlersen burada ilerleme halkası görünür.</Txt>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
            {/* Bu ayın hedefi %100'e ulaştığı anda: halka bir kez "pop" + parçacık patlaması */}
            <Reanimated.View style={ringPop}>
            <GoalRing percent={g.percent} size={156}>
              <AnimatedNumber value={g.percent} format={(n) => `%${Math.round(n)}`} style={{ fontSize: 33.6, lineHeight: 33.6, fontWeight: "700", letterSpacing: -0.84 }} />
              <Txt muted style={{ marginTop: 4, fontSize: 11, lineHeight: 16.5, fontWeight: "600", letterSpacing: 0.55, textTransform: "uppercase" }}>{g.percent >= 100 ? "Tamam" : "Hedef"}</Txt>
            </GoalRing>
            <Celebrate burst={burst} distance={92} />
            </Reanimated.View>
            <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
              {g.mode === "hours" ? (
                <>
                  <HeroStat label="Yapılan mesai" value={g.done} format={fmtHrs} />
                  <HeroStat label="Kalan" value={remainingHours} format={fmtHrs} done={remainingHours <= 0} />
                  <HeroStat label="Toplam kazanç" value={g.income} format={fmtMoney} small />
                </>
              ) : (
                <>
                  <HeroStat label="Bu ay kazanç" value={g.income} format={fmtMoney} />
                  <HeroStat label="Kalan" value={remainingMoney} format={fmtMoney} done={remainingMoney <= 0} />
                  <HeroStat label="Kalan mesai" value={g.hoursLeft} format={fmtHrs} small done={remainingMoney <= 0}
                    note={remainingMoney > 0 ? `toplam ${fmtHrs(g.hoursNeeded)}` : undefined} />
                </>
              )}
            </View>
          </View>
          <Txt muted style={{ fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] }}>
            Maaş {money(opt.monthly_salary, cur)}{g.deduction > 0 ? ` − kesinti ${money(g.deduction, cur)}` : ""} + mesai {money(g.earned, cur)}
          </Txt>
          {pr ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Tile>
                <Txt muted style={styles.tileLabel}>Bu tempoyla ay sonu</Txt>
                {pr.early ? (
                  <>
                    <Txt muted numberOfLines={1} adjustsFontSizeToFit style={styles.tileValue}>Henüz erken</Txt>
                    <Txt muted style={[styles.tileLabel, { marginTop: 2 }]}>birkaç iş günü sonra</Txt>
                  </>
                ) : (
                  <>
                    <Txt numberOfLines={1} adjustsFontSizeToFit style={styles.tileValue}>{pr.mode === "hours" ? fmtHrs(pr.projectedHours) : money(pr.projectedIncome, cur)}</Txt>
                    <Txt style={[styles.tileLabel, { marginTop: 2, fontWeight: "500", color: pr.onTrack ? c.tint : c.mutedForeground }]}>{pr.onTrack ? "Hedefin üstünde" : "Hedefin altında"}</Txt>
                  </>
                )}
              </Tile>
              <Tile>
                <Txt muted style={styles.tileLabel}>Hedef için günlük</Txt>
                {pr.reached ? <Txt style={[styles.tileValue, { color: c.tint }]}>Tamamlandı</Txt>
                  : (
                    <>
                      <Txt style={styles.tileValue}>{fmtHrs(pr.perDay)}</Txt>
                      <Txt muted style={[styles.tileLabel, { marginTop: 2 }]}>{remainingLabel(pr)}</Txt>
                    </>
                  )}
              </Tile>
            </View>
          ) : null}
        </>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Aylık hedef">
        <Segmented value={mode} onChange={(m) => { setMode(m); const v = m === "hours" ? opt.monthly_goal_hours : opt.monthly_goal_amount; setValue(v > 0 ? String(v) : ""); }}
          options={[{ value: "amount", label: "Hedef maaş" }, { value: "hours", label: "Mesai saati" }]} />
        <View style={{ gap: 6 }}>
          <Txt style={{ fontSize: 14, lineHeight: 14, fontWeight: "500" }}>{mode === "hours" ? "Bu ay kaç saat mesai yapmak istiyorsun?" : "Bu ay toplam ne kadar kazanmak istiyorsun? (maaş + mesai)"}</Txt>
          <TextInput maxFontSizeMultiplier={1.35} value={value} onChangeText={(t) => setValue(t.replace(/[^0-9.,]/g, ""))} keyboardType="decimal-pad" autoFocus
            placeholder={mode === "hours" ? "Örn. 40" : "Örn. 40000"} placeholderTextColor={c.mutedForeground}
            style={{ height: 44, borderRadius: radius.md, backgroundColor: c.muted, paddingHorizontal: 16, fontSize: 16, color: c.foreground }} />
        </View>
        <Button title="Kaydet" size="lg" onPress={save} style={{ marginTop: 0 }} />
      </Dialog>
    </Card>
  );
}

const styles = {
  tileLabel: { fontSize: 11, lineHeight: 16.5, textAlign: "center" as const },
  tileValue: { fontSize: 18, lineHeight: 22.5, fontWeight: "700" as const, fontVariant: ["tabular-nums" as const], textAlign: "center" as const },
};

function Tile({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <View style={{ flex: 1, borderRadius: radius.md, backgroundColor: c.muted, paddingVertical: 12, paddingHorizontal: 12, alignItems: "center" }}>{children}</View>;
}

function HeroStat({ label, value, format, small, done, note }: {
  label: string; value: number; format: (n: number) => string; small?: boolean; done?: boolean;
  /** Değerin altında küçük gri not (web: Stat note) */
  note?: string;
}) {
  const c = useColors();
  const style = { fontWeight: "700" as const, fontSize: small ? 15 : 20, lineHeight: small ? 19 : 25, letterSpacing: small ? 0 : -0.5 };
  return (
    <View>
      <Txt muted style={{ fontSize: 12, lineHeight: 18 }}>{label}</Txt>
      {/* "Kalan" bitince web'deki gibi sayı yerine "Tamamlandı" yazar */}
      {done ? <Txt numberOfLines={1} style={[style, { color: c.tint }]}>Tamamlandı</Txt>
        : <AnimatedNumber value={value} format={format} numberOfLines={1} adjustsFontSizeToFit style={style} />}
      {note ? (
        <View style={{ alignSelf: "flex-start", maxWidth: "100%", marginTop: 4, borderRadius: 8, backgroundColor: c.muted, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Txt muted numberOfLines={1} style={{ fontSize: 11, lineHeight: 16.5, fontVariant: ["tabular-nums"] }}>{note}</Txt>
        </View>
      ) : null}
    </View>
  );
}
