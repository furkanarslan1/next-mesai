import type { Settings } from "./types";

/** Ayar satırı eksik alan içerdiğinde (eski kayıt) kullanılan varsayılanlar: web ve mobil ortak. */
export const DEFAULT_SETTINGS: Settings = {
  hourly_rate: 0, sunday_multiplier: 2, holiday_multiplier: 2, monthly_goal_amount: 0, currency: "TRY",
  monthly_salary: 0, daily_hours: 8, has_shift: false, shift_type: null, work_start: "08:00", work_end: "16:00",
  sunday_rate: 0, holiday_rate: 0, goal_mode: "amount", monthly_goal_hours: 0, annual_leave_days: 14, budgets: {}, included_overtime_hours: 0, base_hourly_rate: null, weekday_percent: 150, sunday_percent: 150, holiday_percent: 200, sick_leave_unpaid: false, sick_deducts_overtime: false, saturday_off: true, payday: null, shift_rotation: null,
};
