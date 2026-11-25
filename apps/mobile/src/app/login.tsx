import {
  authErrorText, dailyHoursOf, DEFAULT_SCHEDULE, DEFAULT_SHORTCUT_HOURS, DEFAULT_SIGNUP_PAY, SIGNUP_STEPS, signupData, type SignupPay, type WorkSchedule,
} from "@mesai/core/auth";
import { openLegal } from "@/lib/legal";
import { Clock } from "@/components/icons";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, type ScrollViewInstance, type TextInputInstance, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hrs } from "@mesai/core/calc";
import { FormSection, NumberRow, PercentRow, Segmented, SwitchRow } from "@/components/form";
import { Button, Card, Field, Txt } from "@/components/ui";
import { HoursChips, WorkScheduleFields } from "@/components/work-schedule";
import { resetStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { alpha, radius, useColors } from "@/theme";

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
  // Mobil uygulama çalışanlar için: yönetici hesabı (ekip paneli) web'den açılır
  const role = "employee" as "employee" | "manager";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [info, setInfo] = useState("");
  const [forgot, setForgot] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sched, setSched] = useState<WorkSchedule>(DEFAULT_SCHEDULE);
  const [pay, setPay] = useState<SignupPay>(DEFAULT_SIGNUP_PAY);
  const [shortcutHours, setShortcutHours] = useState<number[]>(DEFAULT_SHORTCUT_HOURS);
  const scroll = useRef<ScrollViewInstance>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const pwRef = useRef<TextInputInstance>(null);

  const clear = () => { setMsg(""); setInfo(""); };
  // Kayıt adımı değişince formun başına dön
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [step]);

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
    if (!(mode === "up" && step > 1)) {
      if (mode === "up" && !name.trim()) return setMsg("Adını gir.");
      if (!email.trim()) return setMsg("Geçerli bir e-posta gir.");
      if (password.length < 6) return setMsg("Şifre en az 6 karakter olmalı.");
    }
    // Çalışan kaydı 3 adım: hesap → çalışma düzeni → ücret ve hedef
    if (mode === "up" && role === "employee" && step < SIGNUP_STEPS) {
      clear();
      setStep((step + 1) as 2 | 3);
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
            <WorkStep sched={sched} setSched={setSched} pay={pay} setPay={setPay} shortcutHours={shortcutHours} setShortcutHours={setShortcutHours} />
          ) : mode === "up" && step === 3 && role === "employee" ? (
            <PayStep pay={pay} setPay={setPay} dailyHours={dailyHoursOf(sched) || 8} />
          ) : (
            <>
              {mode === "up" ? (
                <>
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
            title={forgot ? "Sıfırlama bağlantısı gönder" : mode === "in" ? "Giriş yap" : role === "employee" && step < SIGNUP_STEPS ? "Devam" : "Kayıt ol"} />
          {/* Kayıt olurken koşullar ve gizlilik metni (KVKK aydınlatma) */}
          {!forgot && mode === "up" && step === 1 ? (
            <Txt muted style={{ fontSize: 12, lineHeight: 17, textAlign: "center" }}>
              Kayıt olarak <Txt onPress={() => openLegal("terms")} style={{ fontSize: 12, color: c.primary, textDecorationLine: "underline" }}>Kullanım Koşulları</Txt>’nı kabul etmiş olursun. Verilerinin nasıl işlendiği <Txt onPress={() => openLegal("privacy")} style={{ fontSize: 12, color: c.primary, textDecorationLine: "underline" }}>Gizlilik Politikası ve KVKK Aydınlatma Metni</Txt>’nde.
            </Txt>
          ) : null}
          {forgot ? link("← Girişe dön", () => { setForgot(false); clear(); }) : null}
          {!forgot && mode === "up" && step > 1 ? link("← Geri", () => { setStep((step - 1) as 1 | 2); clear(); }) : null}
          {!forgot ? link(mode === "in" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap", () => {
            setMode(mode === "in" ? "up" : "in"); setStep(1); clear(); setUnconfirmed(false);
          }) : null}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Adım başlığı: "Adım 2 / 3" ve açıklama (web: StepTitle) */
function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <View>
      <Txt muted style={{ fontSize: 12, lineHeight: 16, fontWeight: "500" }}>Adım {n} / {SIGNUP_STEPS}</Txt>
      <Txt style={{ fontWeight: "600" }}>{title}</Txt>
      <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>Hesaplamalar bu bilgilere göre yapılır; bilmediklerini boş bırakıp sonra Ayarlar&apos;dan değiştirebilirsin.</Txt>
    </View>
  );
}

type StepProps = { pay: SignupPay; setPay: (p: SignupPay) => void };

/** 2. adım: çalışma düzeni (Ayarlar → Çalışma saati, Kısayollar ve yıllık izin hakkı) */
function WorkStep({ sched, setSched, pay, setPay, shortcutHours, setShortcutHours }: StepProps & {
  sched: WorkSchedule; setSched: (s: WorkSchedule) => void; shortcutHours: number[]; setShortcutHours: (h: number[]) => void;
}) {
  const set = <K extends keyof SignupPay>(k: K, v: SignupPay[K]) => setPay({ ...pay, [k]: v });
  return (
    <>
      <StepTitle n={2} title="Çalışma düzenin" />
      <WorkScheduleFields value={sched} onChange={setSched} />
      <FormSection tone="muted" title="Çalışma günleri" footer={pay.saturday_off
        ? "Haftada 5 gün: cumartesi ve pazar tatil."
        : "Haftada 6 gün: cumartesi normal iş günü, yalnızca pazar tatil."}>
        <SwitchRow label="Cumartesi tatil" hint="İş yerinde cumartesi çalışılmıyorsa açık bırak" value={pay.saturday_off} onChange={(v) => set("saturday_off", v)} />
      </FormSection>
      <FormSection tone="muted" title="Yıllık izin" footer="Yasal asgari hak: 1–5 yıl 14 gün, 5–15 yıl 20 gün, 15 yıl ve üzeri 26 gün.">
        <NumberRow label="Yıllık izin hakkı" suffix="gün" placeholder="14" value={pay.annual_leave_days} onChange={(v) => set("annual_leave_days", v.replace(/\D/g, "").slice(0, 2))} />
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
  );
}

/** 3. adım: ücret ve hedef (Ayarlar → Ücret ve hedef ile aynı alanlar) */
function PayStep({ pay, setPay, dailyHours }: StepProps & { dailyHours: number }) {
  const c = useColors();
  const [fixedOpen, setFixedOpen] = useState(false);
  const set = <K extends keyof SignupPay>(k: K, v: SignupPay[K]) => setPay({ ...pay, [k]: v });
  const line = <View style={{ height: 1, backgroundColor: alpha(c.border, 0.6) }} />;
  return (
    <>
      <StepTitle n={3} title="Ücret ve hedef" />
      <FormSection tone="muted" title="Maaş" footer="Bordrondaki net rakamları gir. Maaşa dahil mesai yoksa boş bırak; örneğin maaşın 10,5 saat mesai içeriyorsa 10,5 yaz.">
        <NumberRow label="Aylık net maaş" suffix="₺" value={pay.monthly_salary} onChange={(v) => set("monthly_salary", v)} />
        <NumberRow label="Maaşa dahil mesai" suffix="saat" hint="Maaşın içerdiği mesai saati" value={pay.included_overtime_hours} onChange={(v) => set("included_overtime_hours", v)} />
        <SwitchRow label="Raporlu günler maaştan düşer" hint="Bordroda “Raporlu (Ücretsiz)” varsa aç" value={pay.sick_leave_unpaid} onChange={(v) => set("sick_leave_unpaid", v)} />
        <SwitchRow label="Raporlu günler mesaiden düşer" hint={`Her raporlu gün için ${hrs(dailyHours)} mesaiden düşülür`} value={pay.sick_deducts_overtime} onChange={(v) => set("sick_deducts_overtime", v)} />
      </FormSection>
      <FormSection tone="muted" title="Mesai ücreti">
        <NumberRow label="Saatlik ücret (%100)" suffix="₺" hint="Bordrodaki “Ek. Mes. %100” ücreti" value={pay.hourly_rate} onChange={(v) => set("hourly_rate", v)} />
        <PercentRow label="Hafta içi mesai" value={pay.weekday_percent} onChange={(v) => set("weekday_percent", v)} />
        <PercentRow label="Pazar mesaisi" value={pay.sunday_percent} onChange={(v) => set("sunday_percent", v)} />
        <PercentRow label="Resmi tatil mesaisi" value={pay.holiday_percent} onChange={(v) => set("holiday_percent", v)} />
      </FormSection>
      <View style={{ borderRadius: radius.lg, backgroundColor: c.muted, overflow: "hidden" }}>
        <Pressable onPress={() => setFixedOpen(!fixedOpen)} accessibilityRole="button" accessibilityState={{ expanded: fixedOpen }}
          style={{ minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}>
          <Txt style={{ fontSize: 15, fontWeight: "500" }}>Sabit saatlik ücretler (isteğe bağlı)</Txt>
          <Txt muted style={{ fontSize: 15, transform: [{ rotate: fixedOpen ? "90deg" : "0deg" }] }}>›</Txt>
        </Pressable>
        {fixedOpen ? (
          <View>
            {line}
            <NumberRow label="Pazar saatlik" suffix="₺" placeholder="Orandan hesapla" value={pay.sunday_rate} onChange={(v) => set("sunday_rate", v)} />
            {line}
            <NumberRow label="Resmi tatil saatlik" suffix="₺" placeholder="Orandan hesapla" value={pay.holiday_rate} onChange={(v) => set("holiday_rate", v)} />
            {line}
            <Txt muted style={{ paddingHorizontal: 16, paddingVertical: 12, fontSize: 12, lineHeight: 16 }}>Doldurursan o gün tipinde oran yerine bu sabit ücret kullanılır.</Txt>
          </View>
        ) : null}
      </View>
      <FormSection tone="muted" title="Aylık hedef" footer="İstersen boş bırak; ana sayfadan sonra da belirleyebilirsin.">
        <View style={{ padding: 12 }}>
          <Segmented value={pay.goal_mode} onChange={(m) => set("goal_mode", m)}
            options={[{ value: "amount", label: "Hedef maaş" }, { value: "hours", label: "Mesai saati" }]} />
        </View>
        {pay.goal_mode === "amount"
          ? <NumberRow label="Toplam kazanç" suffix="₺" placeholder="Örn. 60000" hint="Maaş + mesai kazancı" value={pay.monthly_goal_amount} onChange={(v) => set("monthly_goal_amount", v)} />
          : <NumberRow label="Mesai" suffix="saat" placeholder="Örn. 40" hint="Ayda yapmak istediğin" value={pay.monthly_goal_hours} onChange={(v) => set("monthly_goal_hours", v)} />}
      </FormSection>
    </>
  );
}
