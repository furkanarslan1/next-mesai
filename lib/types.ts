export type EntryType = "overtime" | "paid_leave" | "unpaid_leave" | "sick" | "absent" | "holiday";

export type ShiftType = "day" | "evening" | "night";

export interface Entry {
  id: string;
  user_id: string;
  work_date: string; // YYYY-MM-DD
  type: EntryType;
  hours: number;
  note: string | null;
  start_time: string | null; // HH:MM:SS
  end_time: string | null;
}
export interface Settings {
  hourly_rate: number;
  sunday_multiplier: number;
  holiday_multiplier: number;
  monthly_goal_amount: number;
  currency: string;
  monthly_salary: number;
  daily_hours: number;
  has_shift: boolean;
  shift_type: ShiftType | null;
  /** Normal çalışma giriş/çıkış saati (HH:MM:SS) */
  work_start: string | null;
  work_end: string | null;
  /** 0 = belirtilmedi (saatlik ücret x çarpan kullanılır) */
  sunday_rate: number;
  holiday_rate: number;
  goal_mode: "amount" | "hours";
  monthly_goal_hours: number;
}
export interface Shortcut { id: string; label: string; hours: number; sort: number; start_time: string | null; end_time: string | null }
export interface Profile { id: string; full_name: string; role: "employee" | "manager"; invite_code: string }

export const TYPE_META: Record<EntryType, { label: string; color: string }> = {
  overtime: { label: "Mesai", color: "bg-emerald-400" },
  holiday: { label: "Resmi tatil", color: "bg-amber-400" },
  paid_leave: { label: "Ücretli izin", color: "bg-sky-400" },
  unpaid_leave: { label: "Ücretsiz izin", color: "bg-orange-600" },
  sick: { label: "Raporlu", color: "bg-slate-300" },
  absent: { label: "İşe gelmedim", color: "bg-rose-500" },
};

export const SHIFTS: Record<ShiftType, { label: string; start: string; end: string }> = {
  day: { label: "Gündüz", start: "08:00", end: "16:00" },
  evening: { label: "Akşam", start: "16:00", end: "00:00" },
  night: { label: "Gece", start: "00:00", end: "08:00" },
};
