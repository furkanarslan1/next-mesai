import type { Entry, FinanceItem, Settings } from "../lib/types";

export const SETTINGS: Settings = {
  hourly_rate: 100, sunday_multiplier: 2, holiday_multiplier: 2, monthly_goal_amount: 0, currency: "TRY",
  monthly_salary: 30000, daily_hours: 8, has_shift: false, shift_type: null, work_start: "08:00", work_end: "16:00",
  sunday_rate: 0, holiday_rate: 0, goal_mode: "amount", monthly_goal_hours: 0,
  included_overtime_hours: 0, annual_leave_days: 14, budgets: {},
  // Eski testlerin sayıları korunsun: hafta içi %100 (100 ₺/sa), pazar ve tatil %200
  base_hourly_rate: 100, weekday_percent: 100, sunday_percent: 200, holiday_percent: 200, sick_leave_unpaid: false, saturday_off: true,
};
let n = 0;
export const entry = (work_date: string, type: Entry["type"], hours = 0): Entry => ({
  id: `e${n++}`, user_id: "u", work_date, type, hours, note: null, start_time: null, end_time: null,
});
export const financeItem = (p: Partial<FinanceItem> & Pick<FinanceItem, "kind" | "category" | "amount">): FinanceItem => ({
  id: `f${n++}`, user_id: "u", month: "2026-11-01", spent_on: null, recurring: false, ends_month: null, ...p,
});
export const day = (s: string) => new Date(`${s}T12:00:00`);
