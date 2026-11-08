export type EntryType = "overtime" | "paid_leave" | "unpaid_leave" | "sick" | "absent" | "holiday";

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
}
export interface Shortcut { id: string; label: string; hours: number; sort: number; start_time: string | null; end_time: string | null }
export interface Profile { id: string; full_name: string; role: "employee" | "manager"; invite_code: string }

export const TYPE_META: Record<EntryType, { label: string; color: string }> = {
  overtime: { label: "Mesai", color: "bg-indigo-500" },
  holiday: { label: "Resmi tatil", color: "bg-pink-500" },
  paid_leave: { label: "Ücretli izin", color: "bg-emerald-500" },
  unpaid_leave: { label: "Ücretsiz izin", color: "bg-amber-500" },
  sick: { label: "Raporlu", color: "bg-sky-500" },
  absent: { label: "İşe gelmedim", color: "bg-rose-500" },
};
