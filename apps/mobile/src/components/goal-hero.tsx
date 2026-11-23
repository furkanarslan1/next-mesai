import { goalProgress, hrs, money, monthSummary } from "@mesai/core/calc";
import { errorText } from "@mesai/core/errors";
import { parseNum } from "@mesai/core/num";
import { projection } from "@mesai/core/reports";
import type { Entry, Settings } from "@mesai/core/types";
import { Pencil, Target } from "lucide-react-native";
import { useOptimistic, useState, useTransition } from "react";
import { TextInput, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { mutate } from "@/lib/store";
import { radius, useColors } from "@/theme";
import { Dialog } from "./dialog";
import { Segmented } from "./form";
import { GoalRing } from "./goal-ring";
import { toast } from "./toast";
import { Button, Card, Eyebrow, Stat, Txt } from "./ui";

/** Aylık özet (web'deki MonthSummary): toplam kazanç ve mesai saati / günü / kazancı. */
export function MonthSummary({ entries, settings }: { entries: Entry[]; settings: Settings }) {
  const g = goalProgress(entries, settings);
  const sum = monthSummary(entries, settings);
  const cur = settings.currency;
  const workDays = new Set(entries.filter((e) => (e.type === "overtime" || e.type === "holiday") && Number(e.hours) > 0).map((e) => e.work_date)).size;
  return (
    <View style={{ gap: 20 }}>
      <View style={{ alignItems: "center" }}>
        <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>Bu ay toplam kazanç</Txt>
        <Txt numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 4, fontSize: 48, lineHeight: 48, fontWeight: "700", letterSpacing: -1.2, fontVariant: ["tabular-nums"] }}>{money(g.income, cur)}</Txt>
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
      {sum.includedHours > 0 ? <Txt muted style={{ fontSize: 12, lineHeight: 16, textAlign: "center" }}>{hrs(sum.includedHours)} maaşa dahil · {hrs(sum.paidHours)} ücretli mesai</Txt> : null}
    </View>
  );
}

/** Hedef kartı (web'deki GoalHero): halka, kalan, ay sonu tahmini ve hedefi düzenleme penceresi. */
export function GoalHero({ userId, settings, entries, monthLabel, today }: {
  userId: string; settings: Settings; entries: Entry[]; monthLabel: string; today?: Date;
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
  const fmtHrs = (n: number) => hrs(Math.round(n * 10) / 10);

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
          {g.set ? <Txt style={{ marginTop: 2, fontSize: 17, lineHeight: 25.5, fontWeight: "600" }}>{g.mode === "hours" ? `${hrs(g.goal)} mesai` : money(g.goal, cur)}</Txt> : null}
        </View>
        <Button size="sm" variant="secondary" onPress={openEditor} title={g.set ? "Düzenle" : "Hedef belirle"}
          icon={g.set ? <Pencil size={16} color={c.secondaryForeground} /> : <Target size={16} color={c.secondaryForeground} />} />
      </View>

      {!g.set ? (
        <View style={{ gap: 20 }}>
          <MonthSummary entries={entries} settings={opt} />
          <Txt muted style={{ fontSize: 12, lineHeight: 16, textAlign: "center" }}>Hedef belirlersen burada ilerleme halkası görünür.</Txt>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
            <GoalRing percent={g.percent} size={156}>
              <Txt style={{ fontSize: 33.6, lineHeight: 33.6, fontWeight: "700", letterSpacing: -0.84 }}>%{Math.round(g.percent)}</Txt>
              <Txt muted style={{ marginTop: 4, fontSize: 11, lineHeight: 16.5, fontWeight: "600", letterSpacing: 0.55, textTransform: "uppercase" }}>{g.percent >= 100 ? "Tamam" : "Hedef"}</Txt>
            </GoalRing>
            <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
              {g.mode === "hours" ? (
                <>
                  <HeroStat label="Yapılan mesai" value={fmtHrs(g.done)} />
                  <HeroStat label="Kalan" value={remainingHours > 0 ? fmtHrs(remainingHours) : "Tamamlandı"} done={remainingHours <= 0} />
                  <HeroStat label="Toplam kazanç" value={money(g.income, cur)} small />
                </>
              ) : (
                <>
                  <HeroStat label="Bu ay kazanç" value={money(g.income, cur)} />
                  <HeroStat label="Kalan" value={remainingMoney > 0 ? money(remainingMoney, cur) : "Tamamlandı"} done={remainingMoney <= 0} />
                  <HeroStat label="Gereken toplam mesai" value={fmtHrs(g.hoursNeeded)} small />
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
                <Txt numberOfLines={1} adjustsFontSizeToFit style={styles.tileValue}>{pr.mode === "hours" ? fmtHrs(pr.projectedHours) : money(pr.projectedIncome, cur)}</Txt>
                <Txt style={[styles.tileLabel, { marginTop: 2, fontWeight: "500", color: pr.onTrack ? c.tint : c.mutedForeground }]}>{pr.onTrack ? "Hedefin üstünde" : "Hedefin altında"}</Txt>
              </Tile>
              <Tile>
                <Txt muted style={styles.tileLabel}>Hedef için günlük</Txt>
                {pr.reached ? <Txt style={[styles.tileValue, { color: c.tint }]}>Tamamlandı</Txt>
                  : pr.remaining > 0 ? (
                    <>
                      <Txt style={styles.tileValue}>{fmtHrs(pr.perDay)}</Txt>
                      <Txt muted style={[styles.tileLabel, { marginTop: 2 }]}>kalan {pr.remaining} gün</Txt>
                    </>
                  ) : <Txt muted style={styles.tileValue}>Ay bitti</Txt>}
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
          <TextInput value={value} onChangeText={(t) => setValue(t.replace(/[^0-9.,]/g, ""))} keyboardType="decimal-pad" autoFocus
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

function HeroStat({ label, value, small, done }: { label: string; value: string; small?: boolean; done?: boolean }) {
  const c = useColors();
  return (
    <View>
      <Txt muted style={{ fontSize: 12, lineHeight: 18 }}>{label}</Txt>
      <Txt numberOfLines={1} adjustsFontSizeToFit
        style={{ fontWeight: "700", fontVariant: ["tabular-nums"], fontSize: small ? 15 : 20, lineHeight: small ? 19 : 25, letterSpacing: small ? 0 : -0.5, color: done ? c.tint : c.foreground }}>{value}</Txt>
    </View>
  );
}

