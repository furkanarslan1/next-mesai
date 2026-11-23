import { goalProgress, hrs, money, monthSummary } from "@mesai/core/calc";
import { DEFAULT_SETTINGS } from "@mesai/core/settings";
import type { Entry, Settings } from "@mesai/core/types";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Stat, TAB_BAR_SPACE, Txt } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/theme";

/**
 * İlk sürüm ana sayfa: bu ayın özeti. Hesaplar web ile aynı `@mesai/core` fonksiyonlarından gelir,
 * yani rakamlar web'deki ana sayfayla birebir aynı olmalı. (Önbellek, kısayollar ve gün kartları sonraki adım.)
 */
export default function Home() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const [data, setData] = useState<{ name: string; settings: Settings; entries: Entry[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const today = new Date();

  const load = useCallback(async () => {
    const now = new Date();
    const from = format(startOfMonth(now), "yyyy-MM-dd");
    const to = format(endOfMonth(now), "yyyy-MM-dd");
    const [p, s, e] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", session!.user.id).single(),
      supabase.from("user_settings").select("*").single(),
      supabase.from("entries").select("*").gte("work_date", from).lte("work_date", to).order("work_date"),
    ]);
    const err = p.error ?? s.error ?? e.error;
    if (err) { setError(err.message); return; }
    setError(null);
    setData({ name: p.data?.full_name ?? "", settings: { ...DEFAULT_SETTINGS, ...s.data }, entries: (e.data ?? []) as Entry[] });
  }, [session]);

  useEffect(() => { void load(); }, [load]);

  const g = data ? goalProgress(data.entries, data.settings) : null;
  const sum = data ? monthSummary(data.entries, data.settings) : null;
  const cur = data?.settings.currency ?? "TRY";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: TAB_BAR_SPACE + insets.bottom, paddingHorizontal: 16, gap: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={c.tint} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <View style={{ gap: 4 }}>
        <Txt muted style={{ fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 }}>
          {format(today, "d MMMM EEEE", { locale: tr })}
        </Txt>
        <Txt style={{ fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: -0.7 }}>
          Merhaba{data?.name ? `, ${data.name.split(" ")[0]}` : ""}
        </Txt>
      </View>

      {error ? <Card><Txt>Veriler yüklenemedi: {error}</Txt></Card> : null}
      {!data && !error ? <ActivityIndicator color={c.tint} style={{ marginTop: 40 }} /> : null}

      {g && sum ? (
        <Card style={{ gap: 20 }}>
          <View style={{ alignItems: "center", gap: 6 }}>
            <Txt muted style={{ fontSize: 13, fontWeight: "600", textTransform: "uppercase" }}>
              {format(today, "MMMM yyyy", { locale: tr })} {g.set ? "hedefi" : "özeti"}
            </Txt>
            <Txt style={{ fontSize: 44, fontWeight: "700", letterSpacing: -1, fontVariant: ["tabular-nums"] }}>{money(g.income, cur)}</Txt>
            <Txt muted style={{ fontSize: 12, textAlign: "center" }}>
              Maaş {money(data!.settings.monthly_salary, cur)}{g.deduction > 0 ? ` − kesinti ${money(g.deduction, cur)}` : ""} + mesai {money(g.earned, cur)}
            </Txt>
            {g.set ? (
              <View style={{ width: "100%", marginTop: 8, gap: 6 }}>
                <View style={{ height: 10, borderRadius: 5, backgroundColor: c.muted, overflow: "hidden" }}>
                  <View style={{ width: `${g.percent}%`, height: "100%", borderRadius: 5, backgroundColor: c.ring }} />
                </View>
                <Txt muted style={{ fontSize: 12, textAlign: "center" }}>
                  %{g.percent.toFixed(0)} · hedef {g.mode === "hours" ? hrs(g.goal) : money(g.goal, cur)}
                </Txt>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Stat label="Mesai saati" value={hrs(sum.hours)} />
            <Stat label="Mesai kazancı" value={money(sum.earned, cur)} />
          </View>
          {sum.sickHours > 0 ? (
            <Txt muted style={{ fontSize: 12, textAlign: "center" }}>
              {sum.sickDays} raporlu gün için {hrs(sum.sickHours)} mesaiden düşüldü
            </Txt>
          ) : null}
        </Card>
      ) : null}
    </ScrollView>
  );
}
