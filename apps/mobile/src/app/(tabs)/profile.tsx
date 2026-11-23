import { Alert } from "react-native";
import { Button, Card, Screen, Txt } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { resetStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export default function Profile() {
  const session = useSession();
  return (
    <Screen title="Ayarlar">
      <Card style={{ gap: 12 }}>
        <Txt muted>Giriş yapılan hesap</Txt>
        <Txt style={{ fontWeight: "600" }}>{session?.user.email}</Txt>
      </Card>
      <Button title="Çıkış yap" variant="ghost" onPress={() => Alert.alert("Çıkış yapılsın mı?", undefined, [
        { text: "Vazgeç", style: "cancel" },
        { text: "Çıkış yap", style: "destructive", onPress: async () => { await supabase.auth.signOut(); resetStore(); } },
      ])} />
    </Screen>
  );
}
