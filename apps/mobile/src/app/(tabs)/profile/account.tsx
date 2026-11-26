import { changePassword, MIN_PASSWORD, passwordChangeProblem } from "@mesai/core/auth";
import { errorText } from "@mesai/core/errors";
import { router } from "expo-router";
import { Skeleton } from "@/components/skeleton";
import { KeyRound, LogOut } from "@/components/icons";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { Dialog } from "@/components/dialog";
import { SettingsGroup, SettingsRow } from "@/components/settings-list";
import { toast } from "@/components/toast";
import { Button, Screen, Txt } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { load, resetStore, useProfile } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { radius, useColors } from "@/theme";

const back = { label: "Ayarlar", onPress: () => router.back() };

/** Hesap (web: /profile/account → AccountSettings): ad soyad, şifre değiştirme, çıkış ve hesabı kalıcı silme. */
export default function AccountScreen() {
  const c = useColors();
  const profile = useProfile();
  const [value, setValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
  if (!profile) return <Screen title="Hesap" back={back}><Skeleton style={{ minHeight: 192 }} /></Screen>;
  const name = profile.full_name;
  const current = value ?? name;
  const trimmed = current.trim();

  // Oturum kapanınca kök düzen giriş ekranına geçer; önbellek bir sonraki hesaba taşınmasın
  async function signOut() {
    await supabase.auth.signOut();
    resetStore();
  }
  async function saveName() {
    if (!trimmed || trimmed === name) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: trimmed }).eq("id", profile!.id);
    setBusy(false);
    if (error) { toast.error(errorText(error, "Ad kaydedilemedi")); return; }
    await load.profile(true);
    setValue(null);
    haptic("success");
    toast.success("Adın güncellendi");
  }
  async function deleteAccount() {
    setBusy(true);
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      setBusy(false);
      toast.error(/delete_my_account|function|schema cache/i.test(error.message) ? "Hesap silme henüz etkin değil (sunucu güncellemesi gerekli)." : errorText(error, "Hesap silinemedi"));
      return;
    }
    setConfirm(false);
    toast.success("Hesabın ve tüm verilerin silindi");
    await supabase.auth.signOut().catch(() => {});
    resetStore();
  }

  return (
    <Screen title="Hesap" back={back}>
      <View style={{ gap: 24 }}>
        <SettingsGroup title="Ad Soyad">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 6 }}>
            <TextInput value={current} onChangeText={setValue} maxLength={60} placeholder="Ad Soyad" placeholderTextColor={c.mutedForeground}
              accessibilityLabel="Ad Soyad" autoCapitalize="words" returnKeyType="done" onSubmitEditing={() => void saveName()}
              style={{ flex: 1, minWidth: 0, height: 44, fontSize: 17, color: c.foreground, padding: 0 }} />
            {trimmed !== name ? <Button title="Kaydet" size="sm" disabled={busy || !trimmed} onPress={() => void saveName()} /> : null}
          </View>
        </SettingsGroup>
        <SettingsGroup>
          <SettingsRow icon={KeyRound} color="#e08a3c" label="Şifreyi değiştir" onPress={() => setPwOpen(true)} />
          <SettingsRow icon={LogOut} color="#7f8f9c" label="Çıkış yap" onPress={() => void signOut()} />
        </SettingsGroup>
        <SettingsGroup footer="Mesai kayıtların, ayarların, gelir-gider ve bordroların kalıcı olarak silinir. İstersen önce yedek indir.">
          <SettingsRow label="Hesabımı sil" destructive onPress={() => { setTyped(""); setConfirm(true); }} />
        </SettingsGroup>
      </View>

      <PasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />

      <Dialog open={confirm} onClose={() => setConfirm(false)} showClose={false} padding={24} gap={20}
        title="Hesabın kalıcı olarak silinsin mi?"
        description={<>Bu işlem geri alınamaz. Onaylamak için <Txt style={{ fontSize: 14, fontWeight: "700" }}>SİL</Txt> yaz.</>}>
        <TextInput value={typed} onChangeText={setTyped} placeholder="SİL" placeholderTextColor={c.mutedForeground} autoCapitalize="characters" autoCorrect={false}
          accessibilityLabel="Onay metni" style={{ height: 44, borderRadius: radius.md, backgroundColor: c.muted, paddingHorizontal: 16, fontSize: 16, color: c.foreground }} />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Button title="Vazgeç" variant="secondary" size="md" style={{ flex: 1 }} onPress={() => setConfirm(false)} />
          <Button title="Kalıcı olarak sil" size="md" variant="destructive" style={{ flex: 1 }} loading={busy}
            disabled={busy || typed.trim().toLocaleUpperCase("tr") !== "SİL"} onPress={() => void deleteAccount()} />
        </View>
      </Dialog>
    </Screen>
  );
}

/** Şifreyi değiştir (e-posta gerekmez): mevcut şifre doğrulanır, sonra yenisi yazılır. Web: settings-sections PasswordDialog. */
function PasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useColors();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  function close() {
    setCurrent(""); setNext(""); setAgain(""); setMsg(null);
    onClose();
  }
  async function submit() {
    const problem = passwordChangeProblem(current, next, again);
    if (problem) { setMsg(problem); return; }
    setBusy(true);
    setMsg(null);
    const email = (await supabase.auth.getSession()).data.session?.user.email;
    const error = email ? await changePassword(supabase, email, current, next) : "Oturum bulunamadı, yeniden giriş yap.";
    setBusy(false);
    if (error) { setMsg(error); haptic("warning"); return; }
    haptic("success");
    toast.success("Şifren değiştirildi");
    close();
  }
  const input = { height: 44, borderRadius: radius.md, backgroundColor: c.muted, paddingHorizontal: 16, fontSize: 16, color: c.foreground } as const;
  return (
    <Dialog open={open} onClose={close} showClose={false} padding={24} gap={20}
      title="Şifreyi değiştir" description={`Yeni şifre en az ${MIN_PASSWORD} karakter olmalı.`}>
      <View style={{ gap: 12 }}>
        <TextInput value={current} onChangeText={setCurrent} placeholder="Mevcut şifre" placeholderTextColor={c.mutedForeground} accessibilityLabel="Mevcut şifre"
          secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="password" autoComplete="current-password" style={input} />
        <TextInput value={next} onChangeText={setNext} placeholder="Yeni şifre" placeholderTextColor={c.mutedForeground} accessibilityLabel="Yeni şifre"
          secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" autoComplete="new-password" style={input} />
        <TextInput value={again} onChangeText={setAgain} placeholder="Yeni şifre (tekrar)" placeholderTextColor={c.mutedForeground} accessibilityLabel="Yeni şifre (tekrar)"
          secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" autoComplete="new-password" returnKeyType="done"
          onSubmitEditing={() => void submit()} style={input} />
        {msg ? <Txt accessibilityRole="alert" style={{ fontSize: 14, color: c.destructive }}>{msg}</Txt> : null}
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Button title="Vazgeç" variant="secondary" size="md" style={{ flex: 1 }} onPress={close} />
        <Button title="Kaydet" size="md" style={{ flex: 1 }} loading={busy} disabled={busy || !current || !next || !again} onPress={() => void submit()} />
      </View>
    </Dialog>
  );
}
