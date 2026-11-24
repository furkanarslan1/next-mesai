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

export type SignupPay = {
  monthly_salary: string; hourly_rate: string; included_overtime_hours: string;
  weekday_percent: number; sunday_percent: number; holiday_percent: number; sick_leave_unpaid: boolean;
};
export const DEFAULT_SCHEDULE: WorkSchedule = { work_start: "08:00", work_end: "16:00", has_shift: false, shift_type: "day" };
export const DEFAULT_SIGNUP_PAY: SignupPay = {
  monthly_salary: "", hourly_rate: "", included_overtime_hours: "", weekday_percent: 150, sunday_percent: 100, holiday_percent: 200, sick_leave_unpaid: false,
};
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
      included_overtime_hours: Math.min(200, parsePositive(pay.included_overtime_hours)), sick_leave_unpaid: pay.sick_leave_unpaid,
    }),
  };
}
