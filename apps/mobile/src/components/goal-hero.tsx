import { goalProgress, hrs, money, monthSummary } from "@mesai/core/calc";
import { errorText } from "@mesai/core/errors";
import { parseNum } from "@mesai/core/num";
import { projection } from "@mesai/core/reports";
import type { Entry, Settings } from "@mesai/core/types";
import { Pencil, Target } from "lucide-react-native";
import { useOptimistic, useState, useTransition } from "react";
import { Pressable, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { mutate } from "@/lib/store";
import { useColors } from "@/theme";
import { FormSection, NumberRow, Segmented } from "./form";
import { GoalRing } from "./goal-ring";
import { Sheet } from "./sheet";
import { toast } from "./toast";
import { Button, Card, Stat, Txt } from "./ui";

/** Aylık özet: toplam kazanç ve mesai saati/günü/kazancı (web'deki MonthSummary). */
export function MonthSummary({ entries, settings }: { entries: Entry[]; settings: Settings }) {
  const g = goalProgress(entries, settings);
  const sum = monthSummary(entries, settings);
  const cur = settings.currency;
  const workDays = new Set(entries.filter((e) => (e.type === "overtime" || e.type === "holiday") && Number(e.hours) > 0).map((e) => e.work_date)).size;
  return (
    <View style={{ gap: 18 }}>
      <View style={{ alignItems: "center", gap: 4 }}>
        <Txt muted style={{ fontSize: 14 }}>Bu ay toplam kazanç</Txt>
        <Txt style={{ fontSize: 44, fontWeight: "700", letterSpacing: -1, fontVariant: ["tabular-nums"] }} adjustsFontSizeToFit numberOfLines={1}>{money(g.income, cur)}</Txt>
        <Txt muted style={{ fontSize: 12, textAlign: "center" }}>
          Maaş {money(settings.monthly_salary, cur)}{g.deduction > 0 ? ` − kesinti ${money(g.deduction, cur)}` : ""} + mesai {money(g.earned, cur)}
        </Txt>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Stat label="Mesai saati" value={hrs(sum.hours)} />
        <Stat label="Mesai günü" value={`${workDays} gün`} />
        <Stat label="Mesai kazancı" value={money(sum.earned, cur)} />
      </View>
      {sum.sickHours > 0 ? <Txt muted style={{ fontSize: 12, textAlign: "center" }}>{sum.sickDays} raporlu gün için {hrs(sum.sickHours)} mesaiden düşüldü ({hrs(sum.grossHours)} girildi)</Txt> : null}
      {sum.includedHours > 0 ? <Txt muted style={{ fontSize: 12, textAlign: "center" }}>{hrs(sum.includedHours)} maaşa dahil · {hrs(sum.paidHours)} ücretli mesai</Txt> : null}
    </View>
  );
}

/** Hedef kartı (web'deki GoalHero): halka, kalan, ay sonu tahmini ve hedefi düzenleme paneli. */
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
    haptic();
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
    <Card style={{ gap: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Txt muted style={{ fontSize: 13, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" }}>{monthLabel} {g.set ? "hedefi" : "özeti"}</Txt>
          {g.set ? <Txt style={{ fontSize: 17, fontWeight: "600", marginTop: 2 }}>{g.mode === "hours" ? `${hrs(g.goal)} mesai` : money(g.goal, cur)}</Txt> : null}
        </View>
        <Pressable onPress={openEditor} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: c.muted, opacity: pressed ? 0.7 : 1 })}>
          {g.set ? <Pencil size={15} color={c.foreground} /> : <Target size={15} color={c.foreground} />}
          <Txt style={{ fontSize: 14, fontWeight: "600" }}>{g.set ? "Düzenle" : "Hedef belirle"}</Txt>
        </Pressable>
      </View>

      {!g.set ? (
        <View style={{ gap: 16 }}>
          <MonthSummary entries={entries} settings={opt} />
          <Txt muted style={{ fontSize: 12, textAlign: "center" }}>Hedef belirlersen burada ilerleme halkası görünür.</Txt>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
            <GoalRing percent={g.percent} size={148}>
              <Txt style={{ fontSize: 32, fontWeight: "700", letterSpacing: -0.5 }}>%{Math.round(g.percent)}</Txt>
              <Txt muted style={{ fontSize: 11, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" }}>{g.percent >= 100 ? "Tamam" : "Hedef"}</Txt>
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
          <Txt muted style={{ fontSize: 12, fontVariant: ["tabular-nums"] }}>
            Maaş {money(opt.monthly_salary, cur)}{g.deduction > 0 ? ` − kesinti ${money(g.deduction, cur)}` : ""} + mesai {money(g.earned, cur)}
          </Txt>
          {pr ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1, borderRadius: 18, backgroundColor: c.muted, padding: 12, alignItems: "center" }}>
                <Txt muted style={{ fontSize: 11 }}>Bu tempoyla ay sonu</Txt>
                <Txt style={{ fontSize: 18, fontWeight: "700", fontVariant: ["tabular-nums"] }} adjustsFontSizeToFit numberOfLines={1}>
                  {pr.mode === "hours" ? fmtHrs(pr.projectedHours) : money(pr.projectedIncome, cur)}
                </Txt>
                <Txt style={{ fontSize: 11, fontWeight: "500", color: pr.onTrack ? c.tint : c.mutedForeground }}>{pr.onTrack ? "Hedefin üstünde" : "Hedefin altında"}</Txt>
              </View>
              <View style={{ flex: 1, borderRadius: 18, backgroundColor: c.muted, padding: 12, alignItems: "center" }}>
                <Txt muted style={{ fontSize: 11 }}>Hedef için günlük</Txt>
                {pr.reached ? <Txt style={{ fontSize: 18, fontWeight: "700", color: c.tint }}>Tamamlandı</Txt>
                  : pr.remaining > 0 ? (
                    <>
                      <Txt style={{ fontSize: 18, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{fmtHrs(pr.perDay)}</Txt>
                      <Txt muted style={{ fontSize: 11 }}>kalan {pr.remaining} gün</Txt>
                    </>
                  ) : <Txt muted style={{ fontSize: 18, fontWeight: "700" }}>Ay bitti</Txt>}
              </View>
            </View>
          ) : null}
        </>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Aylık hedef">
        <Segmented value={mode} onChange={(m) => { setMode(m); const v = m === "hours" ? opt.monthly_goal_hours : opt.monthly_goal_amount; setValue(v > 0 ? String(v) : ""); }}
          options={[{ value: "amount", label: "Hedef maaş" }, { value: "hours", label: "Mesai saati" }]} />
        <FormSection footer={mode === "hours" ? "Bu ay kaç saat mesai yapmak istiyorsun?" : "Bu ay toplam ne kadar kazanmak istiyorsun? (maaş + mesai)"}>
          <NumberRow label={mode === "hours" ? "Mesai" : "Toplam kazanç"} suffix={mode === "hours" ? "saat" : "₺"} value={value} onChange={setValue}
            placeholder={mode === "hours" ? "Örn. 40" : "Örn. 40000"} autoFocus />
        </FormSection>
        <Button title="Kaydet" onPress={save} />
      </Sheet>
    </Card>
  );
}

function HeroStat({ label, value, small, done }: { label: string; value: string; small?: boolean; done?: boolean }) {
  const c = useColors();
  return (
    <View>
      <Txt muted style={{ fontSize: 12 }}>{label}</Txt>
      <Txt numberOfLines={1} adjustsFontSizeToFit
        style={{ fontWeight: "700", fontVariant: ["tabular-nums"], fontSize: small ? 15 : 20, letterSpacing: small ? 0 : -0.3, color: done ? c.tint : c.foreground }}>{value}</Txt>
    </View>
  );
}
