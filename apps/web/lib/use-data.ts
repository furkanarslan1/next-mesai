"use client";

import { DEFAULT_SETTINGS, monthKey, mutate, useMonthEntries, useSettings, useShortcuts, useTotalHours } from "./store";

/** Diğer sayfalar için eski arayüz; arkada bölüm bölüm önbellek kullanır. */
export function useMesai(month: Date) {
  const key = monthKey(month);
  const entries = useMonthEntries(key);
  const settings = useSettings();
  const shortcuts = useShortcuts();
  const totalHours = useTotalHours();
  return {
    entries: entries ?? [],
    settings: settings ?? DEFAULT_SETTINGS,
    shortcuts: shortcuts ?? [],
    totalHours: totalHours ?? 0,
    loading: entries === null || settings === null,
    reload: () => mutate.refresh.all(),
  };
}
