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
  /** Mesai bir kısayoldan eklendiyse onun id'si */
  shortcut_id?: string | null;
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
  /** Yıllık izin hakkı (gün) */
  /** %100 (normal) saatlik ücret. Boşsa eski `hourly_rate` (hafta içi mesai ücreti) esas alınır. */
  base_hourly_rate: number | null;
  /** Mesai oranları (%): hafta içi, pazar, resmi tatil. Saatlik ücret x oran / 100 */
  weekday_percent: number;
  sunday_percent: number;
  holiday_percent: number;
  /** Raporlu günler maaştan düşer mi ("Raporlu (Ücretsiz)") */
  sick_leave_unpaid: boolean;
  /** Raporlu her gün için günlük çalışma saati aylık mesaiden düşülür */
  sick_deducts_overtime: boolean;
  /** Maaşa dahil aylık mesai saati (bu kadarına ayrıca ücret ödenmez) */
  included_overtime_hours: number;
  annual_leave_days: number;
  /** Cumartesi hafta tatili mi (false: cumartesi iş günü) */
  saturday_off: boolean;
  /** Gider kategorisi (CategoryKey) -> aylık limit */
  budgets: Record<string, number>;
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

export interface ManagerLink { id: string; status: string; manager_id: string; employee_id: string; name?: string }

export interface FinanceItem {
  id: string;
  user_id: string;
  month: string; // ayın ilk günü, YYYY-MM-01 (tekrarlayanlarda başladığı ay)
  kind: "income" | "expense";
  category: string;
  amount: number;
  spent_on: string | null; // YYYY-MM-DD
  recurring: boolean;
  ends_month: string | null;
}

export interface Payslip {
  id: string;
  user_id: string;
  month: string; // ayın ilk günü
  paid_hours: number;
  paid_amount: number;
  note: string | null;
  // Bordro ayrıntıları (isteğe bağlı)
  unpaid_days?: number | null;
  sick_unpaid_days?: number | null;
  sick_paid_days?: number | null;
  paid_leave_days?: number | null;
  /** oran (%) -> saat, örn. {"150": 27.5, "100": 10.5} */
  overtime_by_pct?: Record<string, number> | null;
  special_deductions?: number | null;
  net_paid?: number | null;
}
