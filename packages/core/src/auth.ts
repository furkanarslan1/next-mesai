/**
 * Giriş/kayıt ortak parçaları (web ve mobil aynı): Supabase'in İngilizce auth hatalarının Türkçesi ve
 * iki adımlı kayıt formundan `user_metadata` (handle_new_user trigger'ı bunu user_settings'e yazar).
 */
import { hoursBetween } from "./calc";
import { errorText } from "./errors";
import { parsePositive } from "./num";
import type { ShiftType } from "./types";

/** Supabase'in İngilizce auth hata mesajlarını Türkçeleştirir. */
export function authErrorText(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-posta veya şifre hatalı.";
  if (m.includes("email not confirmed")) return "E-postan henüz doğrulanmamış. Gelen kutundaki bağlantıya tıkla.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.";
  if (m.includes("password should be at least")) return "Şifre en az 6 karakter olmalı.";
  if (m.includes("should be different from the old password")) return "Yeni şifre eskisiyle aynı olamaz.";
  if (m.includes("reauthentication")) return "Güvenlik için çıkış yapıp yeniden giriş yaptıktan sonra tekrar dene.";
  if (m.includes("rate limit") || m.includes("too many")) return "Çok fazla deneme yapıldı, biraz bekleyip tekrar dene.";
  if (m.includes("invalid email") || m.includes("unable to validate email")) return "Geçerli bir e-posta gir.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Bağlantı kurulamadı. İnternetini kontrol et.";
  return errorText({ message }, "İşlem başarısız, tekrar dene");
}

export interface WorkSchedule {
  work_start: string; // HH:MM
  work_end: string;
  has_shift: boolean;
  shift_type: ShiftType;
}

/** Giriş/çıkıştan günlük normal çalışma süresi. */
export const dailyHoursOf = (w: Pick<WorkSchedule, "work_start" | "work_end">) =>
  w.work_start && w.work_end ? hoursBetween(w.work_start, w.work_end) : 0;

/** Kayıt formunun 2. ve 3. adımı: Ayarlar'daki tüm ücret, hedef ve çalışma seçenekleri (metin alanları string). */
export type SignupPay = {
  monthly_salary: string; hourly_rate: string; included_overtime_hours: string;
  weekday_percent: number; sunday_percent: number; holiday_percent: number;
  sick_leave_unpaid: boolean; sick_deducts_overtime: boolean;
  /** Sabit pazar / resmi tatil saatlik ücreti (boşsa orandan hesaplanır) */
  sunday_rate: string; holiday_rate: string;
  goal_mode: "amount" | "hours"; monthly_goal_amount: string; monthly_goal_hours: string;
  saturday_off: boolean; annual_leave_days: string;
};
export const DEFAULT_SCHEDULE: WorkSchedule = { work_start: "08:00", work_end: "16:00", has_shift: false, shift_type: "day" };
/** Varsayılanlar veritabanı sütun varsayılanlarıyla aynı; tutar/saat alanları boş (0) başlar. */
export const DEFAULT_SIGNUP_PAY: SignupPay = {
  monthly_salary: "", hourly_rate: "", included_overtime_hours: "", weekday_percent: 150, sunday_percent: 150, holiday_percent: 200,
  sick_leave_unpaid: false, sick_deducts_overtime: false, sunday_rate: "", holiday_rate: "",
  goal_mode: "amount", monthly_goal_amount: "", monthly_goal_hours: "", saturday_off: true, annual_leave_days: "14",
};
/** Çalışan kaydı kaç adım: 1 hesap, 2 çalışma düzeni, 3 ücret ve hedef */
export const SIGNUP_STEPS = 3;
export const DEFAULT_SHORTCUT_HOURS = [2.5, 6.5];

/** Kayıtta `options.data` olarak gönderilen bilgiler. Yöneticide yalnızca ad ve rol. */
export function signupData({ name, role, sched, pay, shortcutHours }: {
  name: string; role: "employee" | "manager"; sched: WorkSchedule; pay: SignupPay; shortcutHours: number[];
}) {
  return {
    full_name: name, role,
    ...(role === "employee" && {
      daily_hours: dailyHoursOf(sched) || 8, has_shift: sched.has_shift,
      shift_type: sched.has_shift ? sched.shift_type : "",
      work_start: sched.work_start, work_end: sched.work_end,
      shortcut_hours: shortcutHours.join(","),
      monthly_salary: parsePositive(pay.monthly_salary), hourly_rate: parsePositive(pay.hourly_rate),
      weekday_percent: pay.weekday_percent, sunday_percent: pay.sunday_percent, holiday_percent: pay.holiday_percent,
      included_overtime_hours: Math.min(200, parsePositive(pay.included_overtime_hours)),
      sick_leave_unpaid: pay.sick_leave_unpaid, sick_deducts_overtime: pay.sick_deducts_overtime,
      sunday_rate: parsePositive(pay.sunday_rate), holiday_rate: parsePositive(pay.holiday_rate),
      goal_mode: pay.goal_mode, monthly_goal_amount: parsePositive(pay.monthly_goal_amount), monthly_goal_hours: parsePositive(pay.monthly_goal_hours),
      saturday_off: pay.saturday_off,
      // Boş bırakılırsa yasal asgari hak (14 gün)
      annual_leave_days: pay.annual_leave_days.trim() === "" ? 14 : Math.min(60, Math.round(parsePositive(pay.annual_leave_days))),
    }),
  };
}

/** Şifre en az bu kadar karakter (Supabase varsayılanı; kayıt ve sıfırlama formlarıyla aynı). */
export const MIN_PASSWORD = 6;

/** Şifre değiştirme formu: sorun varsa Türkçe mesaj, yoksa null. */
export function passwordChangeProblem(current: string, next: string, again: string): string | null {
  if (!current) return "Mevcut şifreni gir.";
  if (next.length < MIN_PASSWORD) return `Yeni şifre en az ${MIN_PASSWORD} karakter olmalı.`;
  if (next !== again) return "Yeni şifreler eşleşmiyor.";
  if (next === current) return "Yeni şifre eskisiyle aynı olamaz.";
  return null;
}

type AuthResult = Promise<{ error: { message: string } | null }>;
/** supabase-js istemcisinin burada kullanılan kısmı (web ve mobil istemcisi ikisi de uyar). */
export interface PasswordClient {
  auth: {
    signInWithPassword(c: { email: string; password: string }): AuthResult;
    updateUser(a: { password: string }): AuthResult;
  };
}

/**
 * Giriş yapmış kullanıcının şifresini e-posta göndermeden değiştirir. Önce mevcut şifre doğrulanır
 * (telefonu açık bırakılan birinin şifreyi değiştirip hesabı ele geçirmesin), sonra yeni şifre yazılır.
 * Hata varsa Türkçe mesaj, başarılıysa null.
 */
export async function changePassword(client: PasswordClient, email: string, current: string, next: string): Promise<string | null> {
  const check = await client.auth.signInWithPassword({ email, password: current });
  if (check.error) {
    return check.error.message.toLowerCase().includes("invalid login credentials") ? "Mevcut şifre hatalı." : authErrorText(check.error.message);
  }
  const { error } = await client.auth.updateUser({ password: next });
  return error ? authErrorText(error.message) : null;
}
