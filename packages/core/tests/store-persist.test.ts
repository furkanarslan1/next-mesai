import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureStore, getState, hydrateFromDevice, load, resetStore } from "../src/store";
import { SETTINGS } from "./helpers";

/** Yalnızca bu testlerin dokunduğu kısımları olan sahte Supabase istemcisi */
function fakeClient(uid: string | null) {
  const query = (data: unknown) => {
    const q: Record<string, unknown> = {};
    const chain = () => q;
    ["select", "eq", "order", "gte", "lte", "in", "or", "range"].forEach((m) => { q[m] = chain; });
    q.single = async () => ({ data, error: null });
    q.then = (r: (v: unknown) => void) => r({ data: [], error: null });
    return q;
  };
  return {
    auth: { getSession: async () => ({ data: { session: uid ? { user: { id: uid } } : null } }) },
    from: (t: string) => query(t === "user_settings" ? { ...SETTINGS, monthly_salary: 50000 } : { id: uid, full_name: "Ali", role: "employee" }),
    rpc: async () => ({ data: 0, error: null }),
  } as never;
}

function setup(uid: string | null, saved: string | null) {
  const persist = { read: vi.fn(async () => saved), write: vi.fn(), clear: vi.fn() };
  configureStore({ client: () => fakeClient(uid), persist });
  return persist;
}
const snapshot = (uid: string) => JSON.stringify({
  v: 1, uid, at: 0,
  data: { profile: { id: uid, full_name: "Ali", role: "employee", invite_code: "X" }, settings: { ...SETTINGS, monthly_salary: 30000 }, totalHours: 42, entries: { "2026-11": [] } },
});

describe("cihazda saklanan önbellek", () => {
  beforeEach(() => { resetStore(); });
  afterEach(() => { vi.useRealTimers(); });

  it("aynı kullanıcının görüntüsü açılışta anında yüklenir", async () => {
    setup("u1", snapshot("u1"));
    await hydrateFromDevice();
    expect(getState().settings?.monthly_salary).toBe(30000);
    expect(getState().totalHours).toBe(42);
    expect(getState().entries["2026-11"]).toEqual([]);
  });

  it("başka kullanıcının görüntüsü kullanılmaz ve silinir", async () => {
    const p = setup("u2", snapshot("u1"));
    await hydrateFromDevice();
    expect(getState().settings).toBeNull();
    expect(p.clear).toHaveBeenCalled();
  });

  it("oturum yoksa yüklenmez", async () => {
    setup(null, snapshot("u1"));
    await hydrateFromDevice();
    expect(getState().profile).toBeNull();
  });

  it("yüklenen veri eski sayılır: ekran açılınca sunucudan tazelenir", async () => {
    setup("u1", snapshot("u1"));
    await hydrateFromDevice();
    await load.settings();
    expect(getState().settings?.monthly_salary).toBe(50000);
  });

  it("değişiklikten 1 sn sonra tek yazma; çıkışta silinir", async () => {
    vi.useFakeTimers();
    const p = setup("u1", null);
    await load.profile(true);
    await load.settings(true);
    expect(p.write).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1100);
    expect(p.write).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(p.write.mock.calls[0][0] as string);
    expect([saved.uid, saved.data.settings.monthly_salary]).toEqual(["u1", 50000]);
    resetStore();
    expect(p.clear).toHaveBeenCalled();
  });
});

describe("toplam mesai saati", () => {
  beforeEach(() => { resetStore(); });
  const client = (rpcError: { code: string } | null) => {
    const select = vi.fn(() => ({ in: async () => ({ data: [{ hours: 2 }, { hours: 3 }], error: null }) }));
    return {
      select,
      c: { auth: { getSession: async () => ({ data: { session: null } }) }, from: () => ({ select }), rpc: async () => (rpcError ? { data: null, error: rpcError } : { data: 7.5, error: null }) } as never,
    };
  };
  it("sunucudaki toplam kullanılır", async () => {
    const { c, select } = client(null);
    configureStore({ client: () => c });
    await load.totalHours(true);
    expect(getState().totalHours).toBe(7.5);
    expect(select).not.toHaveBeenCalled();
  });
  it("geçici hata tüm kayıtları indirmeye yol açmaz", async () => {
    const { c, select } = client({ code: "08006" });
    configureStore({ client: () => c });
    await load.totalHours(true);
    expect(getState().totalHours).toBeNull();
    expect(select).not.toHaveBeenCalled();
  });
  it("fonksiyon sunucuda yoksa eski yönteme düşer", async () => {
    const { c, select } = client({ code: "PGRST202" });
    configureStore({ client: () => c });
    await load.totalHours(true);
    expect(getState().totalHours).toBe(5);
    expect(select).toHaveBeenCalled();
  });
});
