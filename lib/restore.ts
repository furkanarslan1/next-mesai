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
  const count = { entries: 0, shortcuts: 0, finance: 0, payslips: 0 };

  const s = rows("user_settings")[0];
  if (s) {
    const time = (v: unknown) => (typeof v === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(v) ? v : null);
    const shift = ["day", "evening", "night"].includes(String(s.shift_type)) ? String(s.shift_type) : null;
    // Yedekteki tüm ayarlar geri yüklenir; yedekte olmayan (eski yedek) alanlara dokunulmaz
    const has = (k: string) => k in s;
    const patch: Record<string, unknown> = {
      hourly_rate: num(s.hourly_rate), sunday_multiplier: num(s.sunday_multiplier) || 2,
      holiday_multiplier: num(s.holiday_multiplier) || 2, monthly_goal_amount: num(s.monthly_goal_amount),
    };
    if (has("monthly_salary")) patch.monthly_salary = num(s.monthly_salary);
    if (has("sunday_rate")) patch.sunday_rate = num(s.sunday_rate);
    if (has("holiday_rate")) patch.holiday_rate = num(s.holiday_rate);
    if (has("daily_hours")) patch.daily_hours = Math.min(24, num(s.daily_hours)) || 8;
    if (has("has_shift")) { patch.has_shift = s.has_shift === true; patch.shift_type = patch.has_shift ? shift : null; }
    if (time(s.work_start)) patch.work_start = time(s.work_start);
    if (time(s.work_end)) patch.work_end = time(s.work_end);
    if (s.goal_mode === "amount" || s.goal_mode === "hours") patch.goal_mode = s.goal_mode;
    if (has("monthly_goal_hours")) patch.monthly_goal_hours = num(s.monthly_goal_hours);
    if (has("annual_leave_days")) patch.annual_leave_days = Math.min(60, Math.round(num(s.annual_leave_days)));
    if (isObj(s.budgets)) {
      const b: Record<string, number> = {};
      Object.entries(s.budgets).forEach(([k, v]) => { if (num(v) > 0) b[k] = num(v); });
      patch.budgets = b;
    }
    if (has("included_overtime_hours")) patch.included_overtime_hours = Math.min(200, num(s.included_overtime_hours));
    const { error } = await supabase.from("user_settings").update(patch).eq("user_id", uid);
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
    ...("recurring" in r ? { spent_on: date(r.spent_on), recurring: r.recurring === true, ends_month: date(r.ends_month) } : {}),
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
  // Bordrolar ay başına tektir (user_id + ay): aynı aya yeniden yükleme üzerine yazar
  const payslips = rows("payslips").filter((r) => date(r.month)).map((r) => ({
    user_id: uid, month: date(r.month)!, paid_hours: Math.max(0, num(r.paid_hours)), paid_amount: Math.max(0, num(r.paid_amount)), note: str(r.note),
  }));
  if (payslips.length) {
    const { error } = await supabase.from("payslips").upsert(payslips, { onConflict: "user_id,month" });
    if (error) throw error;
    count.payslips = payslips.length;
  }
  return count;
}
