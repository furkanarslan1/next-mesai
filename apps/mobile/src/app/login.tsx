import { errorText } from "@mesai/core/errors";
import { useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, type TextInputInstance, View } from "react-native";
import { Button, Card, Field, Screen, Txt } from "@/components/ui";
import { supabase } from "@/lib/supabase";

/** Giriş. Kayıt (iki adımlı form) bir sonraki adımda web'deki gibi eklenecek. */
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const pw = useRef<TextInputInstance>(null);

  async function signIn() {
    if (!email.trim() || !password) return Alert.alert("Eksik bilgi", "E-posta ve şifreni gir.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    // Başarılıysa oturum değişir, kök düzen kendiliğinden ana sayfaya geçer
    if (error) Alert.alert("Giriş yapılamadı", errorText(error, "Giriş yapılamadı"));
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Screen title="Mesai" eyebrow="Hoş geldin" tabs={false}>
        <Txt muted>Mesaini, hedef maaşını ve gelir-giderini takip et.</Txt>
        <Card style={{ gap: 16 }}>
          <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email"
            keyboardType="email-address" textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => pw.current?.focus()} />
          <Field ref={pw} label="Şifre" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password"
            textContentType="password" returnKeyType="go" onSubmitEditing={signIn} />
          <View style={{ marginTop: 4 }}>
            <Button title="Giriş yap" size="lg" loading={busy} onPress={signIn} />
          </View>
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
