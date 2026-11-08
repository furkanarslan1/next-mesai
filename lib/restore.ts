import { createClient } from "@/lib/supabase/client";

const ENTRY_TYPES = ["overtime", "paid_leave", "unpaid_leave", "sick", "absent", "holiday"];
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v: unknown) => (typeof v === "string" ? v : null);
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/** JSON yedeğini giriş yapmış kullanıcının hesabına birleştirir (id'ye göre upsert, mevcut kayıtlar silinmez). */
export async function restoreBackup(text: string) {
  const data: unknown = JSON.parse(text);
  if (!isObj(data)) throw new Error("Geçersiz yedek dosyası");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum yok");
  const uid = user.id;
  const rows = (k: string) => (Array.isArray(data[k]) ? (data[k] as unknown[]).filter(isObj) : []);
  const count = { entries: 0, shortcuts: 0, finance: 0 };

  const s = rows("user_settings")[0];
  if (s) {
    const { error } = await supabase.from("user_settings").update({
      hourly_rate: num(s.hourly_rate), sunday_multiplier: num(s.sunday_multiplier) || 2,
      holiday_multiplier: num(s.holiday_multiplier) || 2, monthly_goal_amount: num(s.monthly_goal_amount),
    }).eq("user_id", uid);
    if (error) throw error;
  }

  const shortcuts = rows("shortcuts").filter((r) => num(r.hours) > 0 && num(r.hours) <= 24).map((r) => ({
    id: str(r.id) ?? undefined, user_id: uid, label: str(r.label) ?? `${num(r.hours)} saat`, hours: num(r.hours),
    sort: num(r.sort), start_time: str(r.start_time), end_time: str(r.end_time),
  }));
  const entries = rows("entries").filter((r) => date(r.work_date) && ENTRY_TYPES.includes(String(r.type))).map((r) => ({
    id: str(r.id) ?? undefined, user_id: uid, work_date: date(r.work_date)!, type: r.type, hours: Math.min(24, num(r.hours)),
    note: str(r.note), start_time: str(r.start_time), end_time: str(r.end_time),
  }));
  const finance = rows("finance_items").filter((r) => date(r.month) && ["income", "expense"].includes(String(r.kind))).map((r) => ({
    id: str(r.id) ?? undefined, user_id: uid, month: date(r.month)!, kind: r.kind,
    category: str(r.category) ?? "Diğer", amount: Math.max(0, num(r.amount)),
  }));

  // id'si olmayanlar insert, olanlar upsert
  for (const [table, list, key] of [["shortcuts", shortcuts, "shortcuts"], ["entries", entries, "entries"], ["finance_items", finance, "finance"]] as const) {
    const withId = list.filter((r) => r.id), noId = list.filter((r) => !r.id).map((r) => ({ ...r, id: undefined }));
    for (let i = 0; i < withId.length; i += 500) {
      const { error } = await supabase.from(table).upsert(withId.slice(i, i + 500), { onConflict: "id" });
      if (error) throw error;
    }
    if (noId.length) { const { error } = await supabase.from(table).insert(noId); if (error) throw error; }
    count[key] = list.length;
  }
  return count;
}
