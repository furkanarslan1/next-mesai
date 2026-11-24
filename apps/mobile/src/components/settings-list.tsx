import { ChevronRight, type LucideIcon } from "@/components/icons";
import { Children, Fragment, isValidElement } from "react";
import { Pressable, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { alpha, radius, useColors } from "@/theme";
import { Txt } from "./ui";

/** iOS Ayarlar grubu (web: SettingsGroup): büyük harfli başlık, kart içinde ince çizgiyle ayrılmış satırlar, altta açıklama. */
export function SettingsGroup({ title, footer, children }: { title?: string; footer?: React.ReactNode; children: React.ReactNode }) {
  const c = useColors();
  const rows = Children.toArray(children).filter((x) => isValidElement(x));
  return (
    <View style={{ gap: 6 }}>
      {title ? <Txt muted style={{ paddingHorizontal: 16, fontSize: 13, lineHeight: 19.5, fontWeight: "500", letterSpacing: 0.325, textTransform: "uppercase" }}>{title}</Txt> : null}
      <View style={{ overflow: "hidden", borderRadius: radius.lg, backgroundColor: c.card, boxShadow: c.shadow.card }}>
        {rows.map((r, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={{ height: 0.5, backgroundColor: c.hairline }} /> : null}
            {r}
          </Fragment>
        ))}
      </View>
      {footer ? <Txt muted style={{ paddingHorizontal: 16, fontSize: 13, lineHeight: 21 }}>{footer}</Txt> : null}
    </View>
  );
}

/** Renkli kare ikon (web: .settings-icon, 30px, 8px köşe, beyaz ikon) */
export function SettingsIcon({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return (
    <View style={{ width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: color }}>
      <Icon size={18} color="#fff" strokeWidth={2.2} />
    </View>
  );
}

/** Renkli ikonlu satır (web: SettingsRow): `chevron` alt sayfaya gider; değer sağda gri yazar. */
export function SettingsRow({ icon, color, label, value, onPress, chevron, destructive }: {
  icon?: LucideIcon; color?: string; label: string; value?: React.ReactNode; onPress?: () => void; chevron?: boolean; destructive?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable onPress={onPress ? () => { haptic(); onPress(); } : undefined} disabled={!onPress} accessibilityRole="button"
      style={({ pressed }) => ({ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: pressed ? c.muted : "transparent" })}>
      {icon ? <SettingsIcon icon={icon} color={color ?? c.teal} /> : null}
      <Txt numberOfLines={1} style={{ flex: 1, minWidth: 0, fontSize: 17, lineHeight: 22, color: destructive ? c.destructive : c.foreground }}>{label}</Txt>
      {value != null ? (
        typeof value === "string"
          ? <Txt muted numberOfLines={1} style={{ maxWidth: "45%", fontSize: 15 }}>{value}</Txt>
          : <View style={{ maxWidth: "45%" }}>{value}</View>
      ) : null}
      {chevron ? <ChevronRight size={20} color={alpha(c.mutedForeground, 0.6)} /> : null}
    </Pressable>
  );
}
