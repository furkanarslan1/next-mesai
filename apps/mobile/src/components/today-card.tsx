import { hhmm, hrs, overtimeAfter } from "@mesai/core/calc";
import { isRestDay } from "@mesai/core/day";
import { TYPE_META, type Entry, type Settings } from "@mesai/core/types";
import { router } from "expo-router";
import { Briefcase, CheckCircle2, Coffee, Moon, Plus, Sparkles, Sunrise, type LucideIcon } from "lucide-react-native";
import { useEffect, useState } from "react";
import { AppState, Pressable, View } from "react-native";
import { radius, useColors } from "@/theme";
import { Card, Txt } from "./ui";

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const dur = (mins: number) => {
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? (m > 0 ? `${h} sa ${m} dk` : `${h} sa`) : `${m} dk`;
};

/** Dakikada bir yenilenen "şimdi"; uygulama öne gelince de hemen güncellenir. */
function useMinute() {
  const [m, setM] = useState(() => Math.floor(Date.now() / 60_000));
  useEffect(() => {
    const tick = () => setM(Math.floor(Date.now() / 60_000));
    const id = setInterval(tick, 15_000);
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") tick(); });
    return () => { clearInterval(id); sub.remove(); };
  }, []);
  return m;
}

/**
 * Canlı "Bugün" kartı (web'deki TodayCard): işe kalan süre, çıkışa geri sayım ve iş günü ilerlemesi;
 * normal çıkıştan sonra "şu ana kadarki mesaiyi ekle" düğmesi. Gece vardiyası desteklenir.
 */
export function TodayCard({ settings, entries, holiday, onAddUntil }: {
  settings: Settings; entries: Entry[]; holiday: string | null; onAddUntil: (exit: string, hours: number) => void;
}) {
  const c = useColors();
  const minute = useMinute();
  const now = new Date(minute * 60_000);
  const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const start = settings.work_start ? hhmm(settings.work_start) : "", end = settings.work_end ? hhmm(settings.work_end) : "";
  const work = entries.find((e) => (e.type === "overtime" || e.type === "holiday") && Number(e.hours) > 0);
  const off = entries.find((e) => ["paid_leave", "unpaid_leave", "sick", "absent"].includes(e.type));
  const weekend = isRestDay(now, settings);

  let Icon: LucideIcon = Briefcase, title = "", sub = "", progress: number | null = null, tone = c.teal;
  let action: React.ReactNode = null;

  if (work) {
    Icon = CheckCircle2; title = `Bugün ${hrs(Number(work.hours))} mesai`; sub = "Kaydedildi. Eline sağlık!";
  } else if (off) {
    Icon = Coffee; title = `Bugün ${TYPE_META[off.type].label.toLocaleLowerCase("tr")}`; sub = "İyi dinlenmeler."; tone = "#7f8f9c";
  } else if (holiday || weekend) {
    Icon = Sparkles; title = holiday ?? (now.getDay() === 6 ? "Bugün cumartesi, tatil" : "Bugün pazar, tatil"); sub = "Çalıştıysan mesaini aşağıdan ekle."; tone = "#d9a514";
  } else if (!start || !end) {
    title = "Bugün iş günü"; sub = "Giriş/çıkış saatini girersen çıkışa geri sayım burada görünür.";
    action = (
      <Pressable onPress={() => router.navigate("/profile/work")} style={{ height: 40, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: "center", backgroundColor: c.muted }}>
        <Txt style={{ fontSize: 14, fontWeight: "600", color: c.tint }}>Ekle</Txt>
      </Pressable>
    );
  } else {
    const s = toMin(start);
    let e = toMin(end);
    if (e <= s) e += 1440; // gece vardiyası
    let n = now.getHours() * 60 + now.getMinutes();
    if (e > 1440 && n < e - 1440) n += 1440;
    if (n < s) {
      Icon = Sunrise; title = `İşe ${dur(s - n)} kaldı`; sub = `Giriş ${start} · Çıkış ${end}`; progress = 0;
    } else if (n < e) {
      title = `Çıkışa ${dur(e - n)} kaldı`; sub = `${start}–${end} · günün %${Math.round(((n - s) / (e - s)) * 100)}'i bitti`;
      progress = (n - s) / (e - s);
    } else {
      const extra = overtimeAfter(end, clock);
      const rounded = Math.floor(extra * 4) / 4; // çeyrek saate yuvarla
      Icon = Moon; tone = "#7a6fd6";
      title = extra > 0 && extra < 12 ? `Çıkış saatinden ${dur(n - e)} geçti` : "Normal mesai bitti";
      sub = rounded > 0 ? "Hâlâ işteysen mesaini tek dokunuşla ekle." : "Bugün mesai yaptıysan eklemeyi unutma.";
      if (rounded > 0 && rounded <= 12) {
        action = (
          <Pressable onPress={() => onAddUntil(clock, rounded)}
            style={({ pressed }) => ({ height: 40, paddingHorizontal: 14, borderRadius: radius.md, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.primary, boxShadow: c.shadow.navy, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            <Plus size={16} color={c.primaryForeground} /><Txt style={{ fontSize: 14, fontWeight: "600", color: c.primaryForeground }}>{hrs(rounded)}</Txt>
          </Pressable>
        );
      }
    }
  }

  return (
    <Card style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: tone, boxShadow: "0px 1px 3px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)" }}>
          <Icon size={22} color="#fff" strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt muted style={{ fontSize: 11, lineHeight: 16.5, fontWeight: "600", letterSpacing: 0.55, textTransform: "uppercase" }}>Bugün · {clock}</Txt>
          <Txt numberOfLines={1} style={{ fontSize: 17, lineHeight: 23.4, fontWeight: "600" }}>{title}</Txt>
          <Txt muted numberOfLines={1} style={{ fontSize: 13, lineHeight: 19.5 }}>{sub}</Txt>
        </View>
        {action}
      </View>
      {progress !== null ? (
        <View style={{ height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: c.ringTrack }}>
          <View style={{ height: "100%", width: `${Math.max(2, progress * 100)}%`, borderRadius: 3, experimental_backgroundImage: `linear-gradient(to right, ${c.ringA}, ${c.ringB})` }} />
        </View>
      ) : null}
    </Card>
  );
}
