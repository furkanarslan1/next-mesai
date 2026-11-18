"use client";

/**
 * Bölüm bölüm önbellek: ayarlar, kısayollar, aylık kayıtlar ve toplam saat ayrı "dilimler"dir.
 * - Bir dilim bir kez yüklenir, sayfalar arası gezinirken önbellekten anında gelir.
 * - Bir değişiklik sadece ilgili dilimi günceller; o dilimi kullanan bileşenler yeniden çizilir.
 * - Sunucu cevabı dönmeden önceki anlık görünüm için bileşenlerde React'in useOptimistic'i kullanılır.
 */
import { useEffect, useSyncExternalStore } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Entry, Settings, Shortcut } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  hourly_rate: 0, sunday_multiplier: 2, holiday_multiplier: 2, monthly_goal_amount: 0, currency: "TRY",
  monthly_salary: 0, daily_hours: 8, has_shift: false, shift_type: null, work_start: "08:00", work_end: "16:00",
  sunday_rate: 0, holiday_rate: 0, goal_mode: "amount", monthly_goal_hours: 0,
};

interface State {
  settings: Settings | null;
  shortcuts: Shortcut[] | null;
  totalHours: number | null;
  entries: Record<string, Entry[]>; // "yyyy-MM" -> kayıtlar
}

const EMPTY: State = { settings: null, shortcuts: null, totalHours: null, entries: {} };
let state: State = EMPTY;
const listeners = new Set<() => void>();
const inflight = new Map<string, Promise<void>>();
// Kullanıcı değişirse eski isteklerin sonucu yeni oturuma yazılmasın
let epoch = 0;

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Çıkış/giriş sırasında başka kullanıcının verisi kalmasın. */
export function resetStore() {
  epoch++;
  inflight.clear();
  set({ ...EMPTY, entries: {} });
}

export const monthKey = (d: Date) => format(d, "yyyy-MM");

function once(key: string, fn: () => Promise<void>) {
  const cur = inflight.get(key);
  if (cur) return cur;
  const ep = epoch;
  const p = fn().finally(() => { if (ep === epoch) inflight.delete(key); });
  inflight.set(key, p);
  return p;
}

/* ---------- yükleyiciler (yoksa getirir, varsa dokunmaz; force ile yeniler) ---------- */
export const load = {
  settings: (force = false) => (!force && state.settings ? Promise.resolve() : once("settings", async () => {
    const ep = epoch;
    const { data } = await createClient().from("user_settings").select("*").single();
    if (ep === epoch && data) set({ settings: { ...DEFAULT_SETTINGS, ...(data as Partial<Settings>) } });
  })),
  shortcuts: (force = false) => (!force && state.shortcuts ? Promise.resolve() : once("shortcuts", async () => {
    const ep = epoch;
    const { data } = await createClient().from("shortcuts").select("*").order("sort");
    if (ep === epoch) set({ shortcuts: (data ?? []) as Shortcut[] });
  })),
  totalHours: (force = false) => (!force && state.totalHours !== null ? Promise.resolve() : once("total", async () => {
    const ep = epoch;
    const { data } = await createClient().from("entries").select("hours").in("type", ["overtime", "holiday"]);
    if (ep === epoch) set({ totalHours: (data ?? []).reduce((a, r) => a + Number(r.hours), 0) });
  })),
  entries: (key: string, force = false) => (!force && state.entries[key] ? Promise.resolve() : once(`e:${key}`, async () => {
    const ep = epoch;
    const d = new Date(`${key}-01T00:00:00`);
    const { data } = await createClient().from("entries").select("*")
      .gte("work_date", format(startOfMonth(d), "yyyy-MM-dd")).lte("work_date", format(endOfMonth(d), "yyyy-MM-dd"))
      .order("work_date").order("created_at");
    if (ep === epoch) set({ entries: { ...state.entries, [key]: (data ?? []) as Entry[] } });
  })),
};

/* ---------- dilim okuyucu hook'lar (sadece kendi diliminde yeniden çizilir) ---------- */
export function useSettings() {
  const v = useSyncExternalStore(subscribe, () => state.settings, () => null);
  useEffect(() => { load.settings(); }, []);
  return v;
}
export function useShortcuts() {
  const v = useSyncExternalStore(subscribe, () => state.shortcuts, () => null);
  useEffect(() => { load.shortcuts(); }, []);
  return v;
}
export function useTotalHours() {
  const v = useSyncExternalStore(subscribe, () => state.totalHours, () => null);
  useEffect(() => { load.totalHours(); }, []);
  return v;
}
export function useMonthEntries(key: string) {
  const v = useSyncExternalStore(subscribe, () => state.entries[key] ?? null, () => null);
  useEffect(() => { load.entries(key); }, [key]);
  return v;
}

/* ---------- yazma işlemleri: sunucu onayından sonra yalnızca ilgili dilimi günceller ---------- */
const counts = (e: { type: string }) => e.type === "overtime" || e.type === "holiday";

export const mutate = {
  patchSettings(patch: Partial<Settings>) {
    if (state.settings) set({ settings: { ...state.settings, ...patch } });
  },
  async saveSettings(userId: string, patch: Partial<Settings>) {
    const { error } = await createClient().from("user_settings").update(patch).eq("user_id", userId);
    if (error) throw error;
    mutate.patchSettings(patch);
  },
  async addEntry(row: Omit<Entry, "id">) {
    const { data, error } = await createClient().from("entries").insert(row).select().single();
    if (error) throw error;
    const e = data as Entry;
    const key = e.work_date.slice(0, 7);
    // Yüklenmemiş ay dilimine tek kayıt yazmayalım (eksik liste olur)
    if (state.entries[key]) set({ entries: { ...state.entries, [key]: [...state.entries[key], e] } });
    if (state.totalHours !== null && counts(e)) set({ totalHours: state.totalHours + Number(e.hours) });
  },
  async removeEntry(e: Entry) {
    const { error } = await createClient().from("entries").delete().eq("id", e.id);
    if (error) throw error;
    const key = e.work_date.slice(0, 7);
    if (state.entries[key]) set({ entries: { ...state.entries, [key]: state.entries[key].filter((x) => x.id !== e.id) } });
    if (state.totalHours !== null && counts(e)) set({ totalHours: Math.max(0, state.totalHours - Number(e.hours)) });
  },
  /** Başka sayfalardan (kısayol ekle/sil, geri yükleme vb.) gelen değişiklikler için ilgili dilimi yeniler. */
  refresh: {
    settings: () => load.settings(true),
    shortcuts: () => load.shortcuts(true),
    entries: (key: string) => Promise.all([load.entries(key, true), load.totalHours(true)]),
    all: () => Promise.all([
      load.settings(true), load.shortcuts(true), load.totalHours(true),
      ...Object.keys(state.entries).map((k) => load.entries(k, true)),
    ]),
  },
};
