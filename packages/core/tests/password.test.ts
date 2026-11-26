import { describe, expect, it, vi } from "vitest";
import { changePassword, passwordChangeProblem, type PasswordClient } from "../src/auth";

describe("şifre değiştirme formu", () => {
  it("eksik/uyuşmayan alanları yakalar", () => {
    expect(passwordChangeProblem("", "yenisifre", "yenisifre")).toBe("Mevcut şifreni gir.");
    expect(passwordChangeProblem("eski123", "kisa", "kisa")).toMatch(/en az 6/);
    expect(passwordChangeProblem("eski123", "yenisifre", "yenisifr")).toBe("Yeni şifreler eşleşmiyor.");
    expect(passwordChangeProblem("eski123", "eski123", "eski123")).toBe("Yeni şifre eskisiyle aynı olamaz.");
    expect(passwordChangeProblem("eski123", "yenisifre", "yenisifre")).toBeNull();
  });
});

const client = (signInError: string | null, updateError: string | null = null) => {
  const c = {
    auth: {
      signInWithPassword: vi.fn(async () => ({ error: signInError ? { message: signInError } : null })),
      updateUser: vi.fn(async () => ({ error: updateError ? { message: updateError } : null })),
    },
  } satisfies PasswordClient;
  return c;
};

describe("changePassword", () => {
  it("önce mevcut şifreyi doğrular, sonra yenisini yazar", async () => {
    const c = client(null);
    expect(await changePassword(c, "a@b.co", "eski123", "yenisifre")).toBeNull();
    expect(c.auth.signInWithPassword).toHaveBeenCalledWith({ email: "a@b.co", password: "eski123" });
    expect(c.auth.updateUser).toHaveBeenCalledWith({ password: "yenisifre" });
  });
  it("mevcut şifre yanlışsa yenisini yazmaz", async () => {
    const c = client("Invalid login credentials");
    expect(await changePassword(c, "a@b.co", "yanlis", "yenisifre")).toBe("Mevcut şifre hatalı.");
    expect(c.auth.updateUser).not.toHaveBeenCalled();
  });
  it("sunucu hatalarını Türkçeleştirir", async () => {
    expect(await changePassword(client(null, "New password should be different from the old password."), "a@b.co", "x", "y")).toBe("Yeni şifre eskisiyle aynı olamaz.");
    expect(await changePassword(client("Request rate limit reached"), "a@b.co", "x", "y")).toMatch(/Çok fazla deneme/);
  });
});
