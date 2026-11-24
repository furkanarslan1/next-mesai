import {
  authErrorText, DEFAULT_SCHEDULE, DEFAULT_SHORTCUT_HOURS, DEFAULT_SIGNUP_PAY, signupData, type SignupPay, type WorkSchedule,
} from "@mesai/core/auth";
import { Clock } from "lucide-react-native";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, type ScrollViewInstance, type TextInputInstance, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FormSection, NumberRow, PercentRow, SwitchRow } from "@/components/form";
import { Button, Card, Field, Txt } from "@/components/ui";
import { HoursChips, WorkScheduleFields } from "@/components/work-schedule";
import { resetStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/theme";

/**
 * Şifre sıfırlama bağlantısının açılacağı web sayfası. Yeni şifre web'deki /reset-password sayfasında
 * belirlenir; adres yoksa Supabase'in Site URL'i kullanılır.
 */
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, "");

/** Giriş, iki adımlı kayıt ve şifremi unuttum: web'deki app/(auth)/login/page.tsx'in aynısı. */
export default function Login() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [role, setRole] = useState<"employee" | "manager">("employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [info, setInfo] = useState("");
  const [forgot, setForgot] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [sched, setSched] = useState<WorkSchedule>(DEFAULT_SCHEDULE);
  const [pay, setPay] = useState<SignupPay>(DEFAULT_SIGNUP_PAY);
  const [shortcutHours, setShortcutHours] = useState<number[]>(DEFAULT_SHORTCUT_HOURS);
  const scroll = useRef<ScrollViewInstance>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const pwRef = useRef<TextInputInstance>(null);

  const clear = () => { setMsg(""); setInfo(""); };

  async function sendReset() {
    if (!email.trim()) return setMsg("Geçerli bir e-posta gir.");
    setBusy(true); clear();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), WEB_URL ? { redirectTo: `${WEB_URL}/reset-password` } : undefined);
    setBusy(false);
    if (error) return setMsg(authErrorText(error.message));
    setInfo("Bu e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Gelen kutunu (ve spam'i) kontrol et.");
  }

  async function resendConfirmation() {
    setBusy(true); clear();
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
    setBusy(false);
    if (error) return setMsg(authErrorText(error.message));
    setInfo("Doğrulama e-postası tekrar gönderildi.");
  }

  async function submit() {
    if (forgot) return sendReset();
    // Web'deki zorunlu alan / en az 6 karakter kontrolleri (tarayıcı formu yerine)
    if (!(mode === "up" && step === 2)) {
      if (mode === "up" && !name.trim()) return setMsg("Adını gir.");
      if (!email.trim()) return setMsg("Geçerli bir e-posta gir.");
      if (password.length < 6) return setMsg("Şifre en az 6 karakter olmalı.");
    }
    if (mode === "up" && role === "employee" && step === 1) {
      clear();
      setStep(2);
      scroll.current?.scrollTo({ y: 0, animated: false });
      return;
    }
    setBusy(true);
    clear(); setUnconfirmed(false);
    // Önceki hesabın önbelleği yeni hesaba taşınmasın (oturum açılınca ekranlar baştan yükler)
    resetStore();
    const { error, data } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { data: signupData({ name: name.trim(), role, sched, pay, shortcutHours }) } });
    setBusy(false);
    if (error) {
      setUnconfirmed(error.message.toLowerCase().includes("email not confirmed"));
      return setMsg(authErrorText(error.message));
    }
    if (mode === "up" && !data.session) {
      setUnconfirmed(true);
      return setInfo("Doğrulama e-postası gönderdik. Bağlantıya tıkladıktan sonra giriş yapabilirsin.");
    }
    // Başarılıysa oturum değişir, kök düzen kendiliğinden ana sayfaya geçer
  }

  const link = (text: string, onPress: () => void, style?: object) => (
    <Pressable onPress={onPress} disabled={busy} hitSlop={4} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <Txt muted style={[{ fontSize: 14, lineHeight: 20, textAlign: "center" }, style]}>{text}</Txt>
    </Pressable>
  );
  const setP = <K extends keyof SignupPay>(k: K, v: SignupPay[K]) => setPay({ ...pay, [k]: v });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior="padding">
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", gap: 24, padding: 20, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, width: "100%", maxWidth: 384, alignSelf: "center" }}>
        <View style={{ alignItems: "center" }}>
          <View style={{ width: 64, height: 64, marginBottom: 16, borderRadius: 32, alignItems: "center", justifyContent: "center",
            backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, boxShadow: c.shadow.card }}>
            <Clock size={32} color={c.primary} />
          </View>
          <Txt style={{ fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.75 }}>Mesai</Txt>
          <Txt muted style={{ fontSize: 16, lineHeight: 24, textAlign: "center" }}>Mesaini, hedefini ve gelirini tek yerde takip et.</Txt>
        </View>

        <Card style={{ padding: 16, gap: 16 }}>
          {forgot ? (
            <>
              <View>
                <Txt style={{ fontWeight: "600" }}>Şifreni sıfırla</Txt>
                <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>E-postanı yaz, sana yeni şifre belirleme bağlantısı gönderelim.</Txt>
              </View>
              <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address"
                textContentType="emailAddress" returnKeyType="send" onSubmitEditing={() => void submit()} />
            </>
          ) : mode === "up" && step === 2 && role === "employee" ? (
            <>
              <View>
                <Txt style={{ fontWeight: "600" }}>Çalışma bilgilerin</Txt>
                <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>Hesaplamalar bu bilgilere göre yapılır, sonra ayarlardan değiştirebilirsin.</Txt>
              </View>
              <WorkScheduleFields value={sched} onChange={setSched} />
              <FormSection tone="muted" title="Maaş" footer="Bordrondaki net rakamları gir; bilmiyorsan boş bırakıp sonra ayarlardan doldurabilirsin.">
                <NumberRow label="Aylık net maaş" suffix="₺" value={pay.monthly_salary} onChange={(v) => setP("monthly_salary", v)} />
                <NumberRow label="Maaşa dahil mesai" suffix="saat" placeholder="10.5" hint="Maaşın belli saat mesai içeriyorsa" value={pay.included_overtime_hours} onChange={(v) => setP("included_overtime_hours", v)} />
                <SwitchRow label="Raporlu günler maaştan düşer" value={pay.sick_leave_unpaid} onChange={(v) => setP("sick_leave_unpaid", v)} />
              </FormSection>
              <FormSection tone="muted" title="Mesai ücreti">
                <NumberRow label="Saatlik ücret (%100)" suffix="₺" value={pay.hourly_rate} onChange={(v) => setP("hourly_rate", v)} />
                <PercentRow label="Hafta içi mesai" value={pay.weekday_percent} onChange={(v) => setP("weekday_percent", v)} />
                <PercentRow label="Pazar mesaisi" value={pay.sunday_percent} onChange={(v) => setP("sunday_percent", v)} />
                <PercentRow label="Resmi tatil mesaisi" value={pay.holiday_percent} onChange={(v) => setP("holiday_percent", v)} />
              </FormSection>
              <View style={{ gap: 8 }}>
                <View>
                  <Txt style={{ fontSize: 14, lineHeight: 20, fontWeight: "500" }}>Sık yaptığın mesailer</Txt>
                  <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>Ana sayfada tek dokunuşla eklemek için (örn. 2.5, 6.5 saat).</Txt>
                </View>
                <HoursChips items={shortcutHours} onAdd={(h) => setShortcutHours([...shortcutHours, h])}
                  onRemove={(h) => setShortcutHours(shortcutHours.filter((x) => x !== h))} />
              </View>
            </>
          ) : (
            <>
              {mode === "up" ? (
                <>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {(["employee", "manager"] as const).map((r) => (
                      <Button key={r} title={r === "employee" ? "Çalışan" : "Yönetici"} variant={role === r ? "primary" : "secondary"}
                        style={{ flex: 1 }} onPress={() => setRole(r)} />
                    ))}
                  </View>
                  <Field label="Ad Soyad" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" textContentType="name"
                    returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />
                </>
              ) : null}
              <Field ref={emailRef} label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address"
                textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => pwRef.current?.focus()} />
              <Field ref={pwRef} label="Şifre" value={password} onChangeText={setPassword} secureTextEntry
                autoComplete={mode === "in" ? "current-password" : "new-password"} textContentType={mode === "in" ? "password" : "newPassword"}
                returnKeyType="go" onSubmitEditing={() => void submit()} />
            </>
          )}

          {mode === "in" && !forgot ? (
            <Pressable onPress={() => { setForgot(true); clear(); }} hitSlop={4} style={{ alignSelf: "flex-end" }}>
              <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>Şifremi unuttum</Txt>
            </Pressable>
          ) : null}
          {msg ? <Txt accessibilityRole="alert" style={{ fontSize: 14, lineHeight: 20, color: c.destructive }}>{msg}</Txt> : null}
          {info ? <Txt style={{ fontSize: 14, lineHeight: 20, color: c.primary }}>{info}</Txt> : null}
          {unconfirmed && email && !forgot ? link("Doğrulama e-postasını tekrar gönder", () => void resendConfirmation(), { color: c.primary }) : null}
          <Button loading={busy} onPress={() => void submit()}
            title={forgot ? "Sıfırlama bağlantısı gönder" : mode === "in" ? "Giriş yap" : role === "employee" && step === 1 ? "Devam" : "Kayıt ol"} />
          {forgot ? link("← Girişe dön", () => { setForgot(false); clear(); }) : null}
          {!forgot && mode === "up" && step === 2 ? link("← Geri", () => { setStep(1); clear(); }) : null}
          {!forgot ? link(mode === "in" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap", () => {
            setMode(mode === "in" ? "up" : "in"); setStep(1); clear(); setUnconfirmed(false);
          }) : null}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
