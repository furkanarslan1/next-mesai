/**
 * Bölüm bölüm önbellek: ayarlar, kısayollar, aylık kayıtlar ve toplam saat ayrı "dilimler"dir.
 * - Bir dilim bir kez yüklenir, sayfalar arası gezinirken önbellekten anında gelir.
 * - Bir değişiklik sadece ilgili dilimi günceller; o dilimi kullanan bileşenler yeniden çizilir.
 * - Sunucu cevabı dönmeden önceki anlık görünüm için bileşenlerde React'in useOptimistic'i kullanılır.
 * - Web ve mobil ortak: Supabase istemcisi ve profilin cihazda saklanması `configureStore` ile verilir,
 *   React hook'ları ve "uygulama öne geldi" olayları her uygulamanın kendi `lib/store` dosyasındadır.
 * - Her dilimin bir "tazelik süresi" (TTL) vardır: süre dolmadıkça sayfa geçişleri veritabanına gitmez;
 *   dolunca eski veri ekranda kalırken arka planda yenilenir (stale-while-revalidate).
 *   Uygulamaya dönüldüğünde (sekme/uygulama öne gelince) yalnızca süresi dolmuş dilimler yenilenir.
 */
import { endOfMonth, format } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll, monthSpan } from "./fetch-all";
import { DEFAULT_SETTINGS } from "./settings";
import type { Entry, FinanceItem, ManagerLink, Payslip, Profile, Settings, Shortcut } from "./types";

export { DEFAULT_SETTINGS };

interface State {
  profile: Profile | null;
  settings: Settings | null;
  shortcuts: Shortcut[] | null;
  totalHours: number | null;
  entries: Record<string, Entry[]>; // "yyyy-MM" -> kayıtlar
  links: ManagerLink[] | null;
  finance: Record<string, FinanceItem[]>; // "yyyy-MM" -> o ayda geçerli kalemler (tekrarlayanlar dahil)
  payslips: Payslip[] | null;
}

const EMPTY: State = { profile: null, settings: null, shortcuts: null, totalHours: null, entries: {}, links: null, finance: {}, payslips: null };

/** Dilim tazelik süreleri (ms). Kayıtlar en sık değişen veridir, ayarlar/profil nadiren. */
const MIN = 60_000;
const TTL = { profile: 30 * MIN, settings: 10 * MIN, shortcuts: 10 * MIN, total: 5 * MIN, entries: 3 * MIN, links: 2 * MIN, finance: 3 * MIN, payslips: 10 * MIN };
let stamps: Record<string, number> = {};
const touch = (k: string) => { stamps[k] = Date.now(); };
const fresh = (k: string, ttl: number) => Date.now() - (stamps[k] ?? 0) < ttl;
// Yerel yazma sayacı: bir okuma sürerken yazma olduysa o okumanın sonucu eski olabilir, tekrar okunur
let writes = 0;
/** Uygulamanın verdiği bağımlılıklar: Supabase istemcisi ve profilin cihazda saklanması (sonraki açılışta ilk çizimde hazır olsun). */
export interface StoreConfig {
  client: () => SupabaseClient;
  saveProfile?: (p: Profile) => void;
  clearProfile?: () => void;
}
let config: StoreConfig | null = null;
const createClient = () => {
  if (!config) throw new Error("configureStore çağrılmadan veri okunamaz");
  return config.client();
};
let state: State = { ...EMPTY };
const listeners = new Set<() => void>();
const inflight = new Map<string, Promise<void>>();
// Şu an okunmakta olan aylar ("e:2026-11", "f:2026-11"): aynı ay için ikinci (çakışan aralıklı) istek atılmaz
const loadingMonths = new Set<string>();
// Kullanıcı değişirse eski isteklerin sonucu yeni oturuma yazılmasın
let epoch = 0;

/** Uygulama açılışında bir kez çağrılır. `savedProfile`: cihazda saklı profil (varsa ilk çizimde kullanılır). */
export function configureStore(c: StoreConfig & { savedProfile?: Profile | null }) {
  config = c;
  if (c.savedProfile && !state.profile) state = { ...state, profile: c.savedProfile };
}
/** Saklı profil sonradan (asenkron depolamadan) okunduysa: sunucudan henüz gelmediyse onu göster. */
export function hydrateProfile(p: Profile | null) {
  if (p && !state.profile) set({ profile: p });
}

export const getState = () => state;

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Çıkış/giriş sırasında başka kullanıcının verisi kalmasın. */
export function resetStore() {
  config?.clearProfile?.();
  epoch++;
  stamps = {};
  inflight.clear();
  loadingMonths.clear();
  set({ ...EMPTY, entries: {}, finance: {}, payslips: null });
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
      config?.saveProfile?.(data as Profile);
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
  entries: (key: string, force = false) => load.entriesRange([key], force),
  /**
   * Birden çok ayın kayıtlarını TEK istekle okur (eksik/eskimiş aylar arasındaki aralık). Raporlar gibi çok aylı
   * ekranlarda ay başına ayrı istek atmak yerine kullanılır: hem istek sayısı hem veri trafiği düşer.
   */
  entriesRange: (keys: string[], force = false): Promise<void> => {
    const need = keys.filter((k) => force || ((!state.entries[k] || !fresh(`e:${k}`, TTL.entries)) && !loadingMonths.has(`e:${k}`)));
    if (need.length === 0) return Promise.resolve();
    const span = monthSpan(need);
    return once(`er:${span[0]}:${span[span.length - 1]}`, async () => {
      const ep = epoch;
      span.forEach((k) => loadingMonths.add(`e:${k}`));
      try {
      const from = `${span[0]}-01`;
      const to = format(endOfMonth(new Date(`${span[span.length - 1]}-01T00:00:00`)), "yyyy-MM-dd");
      const supabase = createClient();
      const rows = await readConsistent(async () => {
        const all = await fetchAll<Entry>((a, b) => supabase.from("entries").select("*").gte("work_date", from).lte("work_date", to)
          .order("work_date").order("created_at").order("id").range(a, b));
        return { data: all, error: all === null };
      });
      if (ep !== epoch || !rows) return;
      const next = { ...state.entries };
      span.forEach((k) => { next[k] = rows.filter((e) => e.work_date.startsWith(k)); touch(`e:${k}`); });
      set({ entries: next });
      } finally { if (ep === epoch) span.forEach((k) => loadingMonths.delete(`e:${k}`)); }
    });
  },
  /** Bir ayın gelir/gider kalemleri; o ayda geçerli tekrarlayanlar da gelir. */
  finance: (key: string, force = false) => load.financeRange([key], force),
  /** Birden çok ayın gelir/gider kalemleri TEK istekle (tekrarlayanlar her ayda geçerli olduğu yerde kopyalanır). */
  financeRange: (keys: string[], force = false): Promise<void> => {
    const need = keys.filter((k) => force || ((!state.finance[k] || !fresh(`f:${k}`, TTL.finance)) && !loadingMonths.has(`f:${k}`)));
    if (need.length === 0) return Promise.resolve();
    const span = monthSpan(need);
    return once(`fr:${span[0]}:${span[span.length - 1]}`, async () => {
      const ep = epoch;
      span.forEach((k) => loadingMonths.add(`f:${k}`));
      try {
      const a = `${span[0]}-01`;
      const b = `${span[span.length - 1]}-01`;
      const supabase = createClient();
      const rows = await readConsistent(async () => {
        let legacy = false; // 0006 migration'ı uygulanmadıysa yalnızca aralıktaki kalemler
        const all = await fetchAll<Record<string, unknown>>(async (x, y) => {
          if (!legacy) {
            const r = await supabase.from("finance_items").select("*").or(`and(month.gte.${a},month.lte.${b}),and(recurring.eq.true,month.lte.${b})`).order("id").range(x, y);
            if (!r.error) return r;
            legacy = true;
          }
          return await supabase.from("finance_items").select("*").gte("month", a).lte("month", b).order("id").range(x, y);
        });
        return { data: all, error: all === null };
      });
      if (ep !== epoch || !rows) return;
      const all = rows.map((d) => ({ spent_on: null, recurring: false, ends_month: null, ...d, amount: Number(d.amount) }) as FinanceItem);
      const next = { ...state.finance };
      span.forEach((k) => {
        const first = `${k}-01`;
        next[k] = all.filter((i) => (i.recurring ? i.month <= first && (!i.ends_month || i.ends_month >= first) : i.month === first));
        touch(`f:${k}`);
      });
      set({ finance: next });
      } finally { if (ep === epoch) span.forEach((k) => loadingMonths.delete(`f:${k}`)); }
    });
  },
  /** Bordro kayıtları (bordro kontrolü). */
  payslips: (force = false) => (!force && state.payslips && fresh("payslips", TTL.payslips) ? Promise.resolve() : once("payslips", async () => {
    const ep = epoch;
    const { data, error } = await createClient().from("payslips").select("*").order("month", { ascending: false });
    if (ep === epoch && !error) {
      touch("payslips");
      set({ payslips: ((data ?? []) as Payslip[]).map((p) => ({ ...p, paid_hours: Number(p.paid_hours), paid_amount: Number(p.paid_amount) })) });
    }
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

/* Ekranda şu an gösterilen dilimler ("e:2026-11", "f:2026-11"): arka planda yalnızca bunlar yenilenir */
const active = new Map<string, number>();
const activeKeys = (prefix: string) => [...active.keys()].filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
/** Bir ekran bu dilimleri gösterirken çağırır; dönen fonksiyon ekrandan çıkınca çağrılır (hook effect'inde). */
export function retain(ids: string[]): () => void {
  ids.forEach((i) => active.set(i, (active.get(i) ?? 0) + 1));
  return () => ids.forEach((i) => { const n = (active.get(i) ?? 1) - 1; if (n <= 0) active.delete(i); else active.set(i, n); });
}

/** Uygulamaya dönülünce yüklü dilimlerden yalnızca süresi dolanlar arka planda yenilenir. */
export function revalidateStale() {
  if (state.profile) load.profile();
  if (state.settings) load.settings();
  if (state.shortcuts) load.shortcuts();
  if (state.totalHours !== null) load.totalHours();
  // Yalnızca ekranda gösterilen aylar yenilenir (gezilmiş eski aylar sonraki görüntülemede yenilenir)
  const ek = activeKeys("e:");
  if (ek.length) load.entriesRange(ek);
  const fk = activeKeys("f:");
  if (fk.length) load.financeRange(fk);
  if (state.payslips) load.payslips();
  if (state.links) load.links();
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
  async updateEntry(e: Entry, patch: Partial<Pick<Entry, "hours" | "start_time" | "end_time" | "note">>) {
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
      // Tekrarlayan kalemler birçok ayı etkiler: ekranda gösterilen tüm aylar tek istekle yenilenir (veri ekranda
      // kalır, yanıp sönmez); gösterilmeyen aylar önbellekten atılıp bir sonraki görüntülemede okunur.
      const shown = [...new Set([...activeKeys("f:"), viewKey])];
      set({ finance: Object.fromEntries(shown.filter((k) => state.finance[k]).map((k) => [k, state.finance[k]])) });
      await load.financeRange(shown, true);
    },
  },
  payslip: {
    async save(row: Omit<Payslip, "id">) {
      const { error } = await createClient().from("payslips").upsert(row, { onConflict: "user_id,month" });
      if (error) throw error;
      await load.payslips(true);
    },
    async remove(id: string) {
      const { error } = await createClient().from("payslips").delete().eq("id", id);
      if (error) throw error;
      await load.payslips(true);
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
    // Geri yükleme gibi toplu değişikliklerden sonra: yüklü tüm dilimler (gelir-gider ve bordro dahil) yenilenir
    all: () => {
      const ek = Object.keys(state.entries);
      const fk = Object.keys(state.finance);
      return Promise.all([
        load.settings(true), load.shortcuts(true), load.totalHours(true),
        ek.length ? load.entriesRange(ek, true) : Promise.resolve(),
        fk.length ? load.financeRange(fk, true) : Promise.resolve(),
        state.payslips ? load.payslips(true) : Promise.resolve(),
      ]);
    },
    /** Aşağı çekip yenileme: profil ve bağlantılar dahil ekranda olabilecek her şey. */
    everything: () => Promise.all([
      mutate.refresh.all(), load.profile(true), state.links ? load.links(true) : Promise.resolve(),
    ]),
  },
};
