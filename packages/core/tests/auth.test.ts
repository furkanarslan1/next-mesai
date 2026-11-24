import { describe, expect, it } from "vitest";
import { authErrorText, DEFAULT_SCHEDULE, DEFAULT_SIGNUP_PAY, signupData } from "../src/auth";

const base = { name: "Ali Veli", sched: DEFAULT_SCHEDULE, pay: DEFAULT_SIGNUP_PAY, shortcutHours: [2.5, 6.5] };

describe("kayıt verisi", () => {
  it("varsayılanlar: maaşa dahil mesai 0, hedef yok, cumartesi tatil, 14 gün izin", () => {
    const d = signupData({ ...base, role: "employee" });
    expect(d).toMatchObject({
      included_overtime_hours: 0, monthly_goal_amount: 0, monthly_goal_hours: 0, goal_mode: "amount",
      saturday_off: true, sick_deducts_overtime: false, annual_leave_days: 14, daily_hours: 8, shortcut_hours: "2.5,6.5",
    });
  });
  it("girilen değerler Türkçe sayıyla okunur ve sınırlanır", () => {
    const d = signupData({ ...base, role: "employee", pay: {
      ...DEFAULT_SIGNUP_PAY, monthly_salary: "45.000", included_overtime_hours: "10,5", goal_mode: "hours", monthly_goal_hours: "40",
      saturday_off: false, sick_deducts_overtime: true, sunday_rate: "550", annual_leave_days: "99",
    } });
    expect(d).toMatchObject({
      monthly_salary: 45000, included_overtime_hours: 10.5, goal_mode: "hours", monthly_goal_hours: 40,
      saturday_off: false, sick_deducts_overtime: true, sunday_rate: 550, annual_leave_days: 60,
    });
  });
  it("yönetici yalnızca ad ve rol gönderir", () => {
    expect(signupData({ ...base, role: "manager" })).toEqual({ full_name: "Ali Veli", role: "manager" });
  });
  it("auth hataları Türkçe", () => {
    expect(authErrorText("Invalid login credentials")).toBe("E-posta veya şifre hatalı.");
  });
});
