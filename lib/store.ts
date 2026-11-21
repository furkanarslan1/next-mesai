"use client";

/**
 * Bölüm bölüm önbellek: ayarlar, kısayollar, aylık kayıtlar ve toplam saat ayrı "dilimler"dir.
 * - Bir dilim bir kez yüklenir, sayfalar arası gezinirken önbellekten anında gelir.
 * - Bir değişiklik sadece ilgili dilimi günceller; o dilimi kullanan bileşenler yeniden çizilir.
 * - Sunucu cevabı dönmeden önceki anlık görünüm için bileşenlerde React'in useOptimistic'i kullanılır.
 * - Her dilimin bir "tazelik süresi" (TTL) vardır: süre dolmadıkça sayfa geçişleri veritabanına gitmez;
 *   dolunca eski veri ekranda kalırken arka planda yenilenir (stale-while-revalidate).
 *   Uygulamaya dönüldüğünde (sekme/uygulama öne gelince) yalnızca süresi dolmuş dilimler yenilenir.
 */
import { useEffect, useSyncExternalStore } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Entry, FinanceItem, ManagerLink, Profile, Settings, Shortcut } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  hourly_rate: 0, sunday_multiplier: 2, holiday_multiplier: 2, monthly_goal_amount: 0, currency: "TRY",
  monthly_salary: 0, daily_hours: 8, has_shift: false, shift_type: null, work_start: "08:00", work_end: "16:00",
  sunday_rate: 0, holiday_rate: 0, goal_mode: "amount", monthly_goal_hours: 0,
};

interface State {
  profile: Profile | null;
  settings: Settings | null;
  shortcuts: Shortcut[] | null;
  totalHours: number | null;
  entries: Record<string, Entry[]>; // "yyyy-MM" -> kayıtlar
  links: ManagerLink[] | null;
  finance: Record<string, FinanceItem[]>; // "yyyy-MM" -> o ayda geçerli kalemler (tekrarlayanlar dahil)
}

const EMPTY: State = { profile: null, settings: null, shortcuts: null, totalHours: null, entries: {}, links: null, finance: {} };

/** Dilim tazelik süreleri (ms). Kayıtlar en sık değişen veridir, ayarlar/profil nadiren. */
const MIN = 60_000;
const TTL = { profile: 30 * MIN, settings: 10 * MIN, shortcuts: 10 * MIN, total: 5 * MIN, entries: 3 * MIN, links: 2 * MIN, finance: 3 * MIN };
let stamps: Record<string, number> = {};
const touch = (k: string) => { stamps[k] = Date.now(); };
const fresh = (k: string, ttl: number) => Date.now() - (stamps[k] ?? 0) < ttl;
// Yerel yazma sayacı: bir okuma sürerken yazma olduysa o okumanın sonucu eski olabilir, tekrar okunur
let writes = 0;
// Profil (ad, rol) bir sonraki açılışta ilk çizimde hazır olsun diye tarayıcıda da tutulur
const PROFILE_KEY = "mesai.profile";
function readSavedProfile(): Profile | null {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(PROFILE_KEY) : null;
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch { return null; }
}
let state: State = { ...EMPTY, profile: readSavedProfile() };
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
  try { window.localStorage.removeItem(PROFILE_KEY); } catch { /* yok say */ }
  epoch++;
  stamps = {};
  inflight.clear();
  set({ ...EMPTY, entries: {}, finance: {} });
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

/* ---------- yükleyiciler (taze önbellek varsa dokunmaz; yoksa/eskiyse getirir; force ile her zaman yeniler) ---------- */
/** Okuma sürerken yazma olduysa sonucu atıp bir kez daha okur (yazılmış kaydın üstüne eski liste yazılmasın). */
async function readConsistent<T>(read: () => Promise<{ data: T | null; error: unknown }>): Promise<T | null> {
  for (let i = 0; i < 3; i++) {
    const w = writes;
    const { data, error } = await read();
    if (error || data === null || data === undefined) return null;
    if (w === writes) return data;
  }
  return null;
}

export const load = {
  profile: (force = false) => (!force && state.profile && fresh("profile", TTL.profile) ? Promise.resolve() : once("profile", async () => {
    const ep = epoch;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (ep === epoch && data) {
      touch("profile");
      set({ profile: data as Profile });
      try { window.localStorage.setItem(PROFILE_KEY, JSON.stringify(data)); } catch { /* yok say */ }
    }
  })),
  settings: (force = false) => (!force && state.settings && fresh("settings", TTL.settings) ? Promise.resolve() : once("settings", async () => {
    const ep = epoch;
    const { data, error } = await createClient().from("user_settings").select("*").single();
    if (ep === epoch && !error && data) { touch("settings"); set({ settings: { ...DEFAULT_SETTINGS, ...(data as Partial<Settings>) } }); }
  })),
  shortcuts: (force = false) => (!force && state.shortcuts && fresh("shortcuts", TTL.shortcuts) ? Promise.resolve() : once("shortcuts", async () => {
    const ep = epoch;
    const { data, error } = await createClient().from("shortcuts").select("*").order("sort");
    if (ep === epoch && !error) { touch("shortcuts"); set({ shortcuts: (data ?? []) as Shortcut[] }); }
  })),
  totalHours: (force = false) => (!force && state.totalHours !== null && fresh("total", TTL.total) ? Promise.resolve() : once("total", async () => {
    const ep = epoch;
    const supabase = createClient();
    // Toplam sunucuda hesaplanır (migration 0005). Henüz uygulanmadıysa eski yönteme düşer.
    let total = await readConsistent(async () => await supabase.rpc("total_overtime_hours"));
    if (total === null) {
      const rows = await readConsistent(async () => await supabase.from("entries").select("hours").in("type", ["overtime", "holiday"]));
      if (rows) total = rows.reduce((a, r) => a + Number(r.hours), 0);
    }
    if (ep === epoch && total !== null) { touch("total"); set({ totalHours: Number(total) }); }
  })),
  entries: (key: string, force = false) => (!force && state.entries[key] && fresh(`e:${key}`, TTL.entries) ? Promise.resolve() : once(`e:${key}`, async () => {
    const ep = epoch;
    const d = new Date(`${key}-01T00:00:00`);
    const rows = await readConsistent(async () => await createClient().from("entries").select("*")
      .gte("work_date", format(startOfMonth(d), "yyyy-MM-dd")).lte("work_date", format(endOfMonth(d), "yyyy-MM-dd"))
      .order("work_date").order("created_at"));
    if (ep === epoch && rows) { touch(`e:${key}`); set({ entries: { ...state.entries, [key]: rows as Entry[] } }); }
  })),
  /** Bir ayın gelir/gider kalemleri; o ayda geçerli tekrarlayanlar da gelir. */
  finance: (key: string, force = false) => (!force && state.finance[key] && fresh(`f:${key}`, TTL.finance) ? Promise.resolve() : once(`f:${key}`, async () => {
    const ep = epoch;
    const first = `${key}-01`;
    const supabase = createClient();
    const rows = await readConsistent(async () => {
      const r = await supabase.from("finance_items").select("*").or(`month.eq.${first},and(recurring.eq.true,month.lte.${first})`);
      if (!r.error) return r;
      // 0006 migration'ı henüz uygulanmadıysa yalnızca o ayın kalemleri
      return await supabase.from("finance_items").select("*").eq("month", first);
    });
    if (ep !== epoch || !rows) return;
    const items = (rows as Record<string, unknown>[])
      .map((d) => ({ spent_on: null, recurring: false, ends_month: null, ...d, amount: Number(d.amount) }) as FinanceItem)
      .filter((i) => (i.recurring ? !i.ends_month || i.ends_month >= first : i.month === first));
    touch(`f:${key}`);
    set({ finance: { ...state.finance, [key]: items } });
  })),
  /** Yönetici bağlantıları (profil sayfası): profil yüklendikten sonra çağrılır. */
  links: (force = false) => (!force && state.links && fresh("links", TTL.links) ? Promise.resolve() : once("links", async () => {
    const ep = epoch;
    const p = state.profile;
    if (!p) return;
    const supabase = createClient();
    const mgr = p.role === "manager";
    const { data: l, error } = await supabase.from("manager_links").select("*").eq(mgr ? "manager_id" : "employee_id", p.id);
    if (error) return;
    const ids = (l ?? []).map((x) => (mgr ? x.employee_id : x.manager_id));
    const { data: names } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
    if (ep === epoch) {
      touch("links");
      set({ links: (l ?? []).map((x) => ({ ...x, name: names?.find((n) => n.id === (mgr ? x.employee_id : x.manager_id))?.full_name })) as ManagerLink[] });
    }
  })),
};

/** Uygulamaya dönülünce yüklü dilimlerden yalnızca süresi dolanlar arka planda yenilenir. */
function revalidateStale() {
  if (state.profile) load.profile();
  if (state.settings) load.settings();
  if (state.shortcuts) load.shortcuts();
  if (state.totalHours !== null) load.totalHours();
  Object.keys(state.entries).forEach((k) => load.entries(k));
  Object.keys(state.finance).forEach((k) => load.finance(k));
  if (state.links) load.links();
}
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") revalidateStale(); });
  window.addEventListener("online", revalidateStale);
}

/* ---------- dilim okuyucu hook'lar (sadece kendi diliminde yeniden çizilir) ---------- */
export function useProfile() {
  const v = useSyncExternalStore(subscribe, () => state.profile, () => null);
  // Kaydedilmiş profil olsa bile arka planda tazele (rol/ad değişmiş olabilir)
  useEffect(() => { load.profile(); }, []);
  return v;
}
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
export function useLinks() {
  const v = useSyncExternalStore(subscribe, () => state.links, () => null);
  const ready = useSyncExternalStore(subscribe, () => state.profile?.id ?? "", () => "");
  useEffect(() => { if (ready) load.links(); }, [ready]);
  return v;
}
export function useFinance(key: string) {
  const v = useSyncExternalStore(subscribe, () => state.finance[key] ?? null, () => null);
  useEffect(() => { load.finance(key); }, [key]);
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
    writes++;
    const { data, error } = await createClient().from("entries").insert(row).select().single();
    writes++;
    if (error) throw error;
    const e = data as Entry;
    const key = e.work_date.slice(0, 7);
    // Yüklenmemiş ay dilimine tek kayıt yazmayalım (eksik liste olur)
    if (state.entries[key]) set({ entries: { ...state.entries, [key]: [...state.entries[key], e] } });
    if (state.totalHours !== null && counts(e)) set({ totalHours: state.totalHours + Number(e.hours) });
    return e;
  },
  async removeEntry(e: Entry) {
    writes++;
    const { error } = await createClient().from("entries").delete().eq("id", e.id);
    writes++;
    if (error) throw error;
    const key = e.work_date.slice(0, 7);
    if (state.entries[key]) set({ entries: { ...state.entries, [key]: state.entries[key].filter((x) => x.id !== e.id) } });
    if (state.totalHours !== null && counts(e)) set({ totalHours: Math.max(0, state.totalHours - Number(e.hours)) });
  },
  /** Bir kaydın saatini/saat aralığını değiştirir; toplam saat farkı kadar güncellenir. */
  async updateEntry(e: Entry, patch: Partial<Pick<Entry, "hours" | "start_time" | "end_time">>) {
    writes++;
    const { data, error } = await createClient().from("entries").update(patch).eq("id", e.id).select().single();
    writes++;
    if (error) throw error;
    const n = data as Entry;
    const key = n.work_date.slice(0, 7);
    if (state.entries[key]) set({ entries: { ...state.entries, [key]: state.entries[key].map((x) => (x.id === n.id ? n : x)) } });
    if (state.totalHours !== null && counts(n)) set({ totalHours: Math.max(0, state.totalHours + Number(n.hours) - Number(e.hours)) });
    return n;
  },
  /**
   * Gelir/gider yazma işlemleri. Tekrarlayan kalemler birçok ayı etkilediği için yazmadan sonra
   * diğer ayların önbelleği atılır, görüntülenen ay yeniden okunur.
   */
  finance: {
    async add(viewKey: string, row: Omit<FinanceItem, "id">) {
      writes++;
      const { error } = await createClient().from("finance_items").insert(row);
      writes++;
      if (error) throw error;
      await mutate.finance.refresh(viewKey);
    },
    async update(viewKey: string, id: string, patch: Partial<Omit<FinanceItem, "id" | "user_id">>) {
      writes++;
      const { error } = await createClient().from("finance_items").update(patch).eq("id", id);
      writes++;
      if (error) throw error;
      await mutate.finance.refresh(viewKey);
    },
    async remove(viewKey: string, id: string) {
      writes++;
      const { error } = await createClient().from("finance_items").delete().eq("id", id);
      writes++;
      if (error) throw error;
      await mutate.finance.refresh(viewKey);
    },
    async refresh(viewKey: string) {
      // Görüntülenen ay ekranda kalsın (yanıp sönmesin), diğer aylar yeniden okunsun
      set({ finance: state.finance[viewKey] ? { [viewKey]: state.finance[viewKey] } : {} });
      await load.finance(viewKey, true);
    },
  },
  async respondLink(id: string, status: "accepted" | "revoked") {
    const { error } = await createClient().from("manager_links").update({ status }).eq("id", id);
    if (error) throw error;
    if (state.links) set({ links: state.links.map((l) => (l.id === id ? { ...l, status } : l)) });
  },
  /** Başka sayfalardan (kısayol ekle/sil, geri yükleme vb.) gelen değişiklikler için ilgili dilimi yeniler. */
  refresh: {
    settings: () => load.settings(true),
    shortcuts: () => load.shortcuts(true),
    entries: (key: string) => Promise.all([load.entries(key, true), load.totalHours(true)]),
    links: () => load.links(true),
    all: () => Promise.all([
      load.settings(true), load.shortcuts(true), load.totalHours(true),
      ...Object.keys(state.entries).map((k) => load.entries(k, true)),
    ]),
  },
};
