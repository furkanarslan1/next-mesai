import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, useColors } from "@/theme";
import { Txt } from "./ui";

/** Alttan açılan panel (web'deki bottom sheet): arka plana dokununca kapanır, klavye açılınca yukarı kayar. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Kapat" />
        <View style={[styles.panel, { backgroundColor: c.card, paddingBottom: insets.bottom + 20 }]}>
          <View style={[styles.grabber, { backgroundColor: c.mutedForeground }]} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 18 }} bounces={false}>
            {title ? <Txt style={{ fontSize: 20, fontWeight: "700" }}>{title}</Txt> : null}
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  panel: { maxHeight: "90%", borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: 20, paddingTop: 22 },
  grabber: { position: "absolute", top: 8, alignSelf: "center", width: 36, height: 5, borderRadius: 3, opacity: 0.45 },
});
