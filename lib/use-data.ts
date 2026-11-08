"use client";

import { useCallback, useEffect, useState } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Entry, Settings, Shortcut } from "./types";

const DEFAULT_SETTINGS: Settings = {
  hourly_rate: 0, sunday_multiplier: 2, holiday_multiplier: 2, monthly_goal_amount: 0, currency: "TRY",
};

export function useMesai(month: Date) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const key = format(month, "yyyy-MM");

  const reload = useCallback(async () => {
    const supabase = createClient();
    const from = format(startOfMonth(month), "yyyy-MM-dd");
    const to = format(endOfMonth(month), "yyyy-MM-dd");
    const [e, s, sc, all] = await Promise.all([
      supabase.from("entries").select("*").gte("work_date", from).lte("work_date", to).order("work_date"),
      supabase.from("user_settings").select("*").single(),
      supabase.from("shortcuts").select("*").order("sort"),
      supabase.from("entries").select("hours").in("type", ["overtime", "holiday"]),
    ]);
    setEntries((e.data ?? []) as Entry[]);
    if (s.data) setSettings(s.data as Settings);
    setShortcuts((sc.data ?? []) as Shortcut[]);
    setTotalHours((all.data ?? []).reduce((a, r) => a + Number(r.hours), 0));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { reload(); }, [reload]);

  return { entries, settings, shortcuts, totalHours, loading, reload };
}
