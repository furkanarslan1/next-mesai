import { hhmm, hrs } from "@mesai/core/calc";
import { dayRules } from "@mesai/core/day";
import { errorText } from "@mesai/core/errors";
import { parseNum } from "@mesai/core/num";
import { addHours } from "@mesai/core/timesheet";
import { TYPE_META, type Entry, type EntryType } from "@mesai/core/types";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { tr } from "date-fns/locale/tr";
import { Pencil, Plus, Trash2 } from "@/components/icons";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { mutate, useSettings } from "@/lib/store";
import { noteMesaiAdded } from "@/lib/review";
import { scheduleFor } from "@mesai/core/shift";
import { radius, useColors } from "@/theme";
import { Sheet } from "./sheet";
import { StatusIcon } from "./status-icon";
import { toast } from "./toast";
import { Button, Txt } from "./ui";

const STATUS: EntryType[] = ["paid_leave", "unpaid_leave", "sick", "absent", "holiday"];
const isStatusRow = (e: Entry) => STATUS.includes(e.type) && !(e.type === "holiday" && Number(e.hours) > 0);
const isWork = (e: Entry) => e.type === "overtime" || e.type === "holiday";

/** Web'deki giriş alanı (h-11, 1.1rem köşe, muted zemin) */
function Input(p: React.ComponentProps<typeof TextInput>) {
  const c = useColors();
  return (
    <TextInput maxFontSizeMultiplier={1.35} placeholderTextColor={c.mutedForeground} {...p}
      style={[{ height: 44, borderRadius: radius.md, backgroundColor: c.muted, paddingHorizontal: 16, fontSize: 16, color: c.foreground, opacity: p.editable === false ? 0.5 : 1 }, p.style]} />
  );
}

function IconBtn({ onPress, label, children }: { onPress: () => void; label: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} hitSlop={4}
      style={({ pressed }) => ({ width: 32, height: 32, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.secondary : "transparent" })}>
      {children}
    </Pressable>
  );
}

/** Günün notu: günün ana kaydına (mesai varsa o, yoksa ilk kayıt) yazılır. */
function NoteEditor({ entry }: { entry: Entry | undefined }) {
  const [text, setText] = useState(entry?.note ?? "");
  const [busy, setBusy] = useState(false);
  const dirty = (text.trim() || null) !== (entry?.note ?? null);
  async function save() {
    if (!entry) return;
    setBusy(true);
    try { await mutate.updateEntry(entry, { note: text.trim() || null }); toast.success("Not kaydedildi"); }
    catch (e) { toast.error(errorText(e, "Kaydedilemedi")); }
    finally { setBusy(false); }
  }
  return (
    <View style={{ gap: 8 }}>
      <Txt style={{ fontSize: 14, lineHeight: 20, fontWeight: "600" }}>Not</Txt>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
        <Input style={{ flex: 1 }} placeholder={entry ? "Örn. acil sevkiyat, fazla yoğundu" : "Not için önce bir kayıt ekle"} value={text} maxLength={200}
          editable={!!entry} onChangeText={setText} returnKeyType="done" onSubmitEditing={() => { if (dirty) void save(); }} accessibilityLabel="Gün notu" />
        <Button title="Kaydet" variant="secondary" disabled={!entry || !dirty || busy} onPress={save} />
      </View>
    </View>
  );
}

type Pending = { title: string; desc: string; yes: string; run: () => Promise<unknown> };

/**
 * Web'deki gün panelinin aynısı: seçilen günün kayıtları; mesai ekleme/değiştirme/silme, not ve gün durumu.
 * Her değişiklik panelin içinde Evet/Hayır onayı ister.
 */
export function DaySheet({ date, entries, userId, onClose }: {
  date: string | null; entries: Entry[]; userId: string; onClose: () => void;
}) {
  const c = useColors();
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [newHours, setNewHours] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState("");

  const day = date ? entries.filter((e) => e.work_date === date) : [];
  const status = day.find(isStatusRow);
  // Günde tek mesai kaydı: varsa yeni eklenemez, saati kalemle değiştirilir ya da silinir
  const hasWork = day.some((e) => isWork(e) && Number(e.hours) > 0);
  const primary = day.find((e) => isWork(e) && Number(e.hours) > 0) ?? day[0];
  const settings = useSettings();
  // Arifede mesainin türü normal çıkış saatine göre (13:00 sonrası tatil oranı)
  const rules = date ? dayRules(day, date, settings ? scheduleFor(parseISO(date), settings).end : null) : null;
  const label = date ? format(parseISO(date), "d MMMM EEEE", { locale: tr }) : "";
  const valid = (v: string) => { const h = parseNum(v); return h > 0 && h <= 24 ? h : 0; };

  async function confirmYes() {
    if (!pending) return;
    setBusy(true);
    try { await pending.run(); haptic("success"); setPending(null); }
    catch (e) { toast.error(errorText(e, "İşlem başarısız")); }
    finally { setBusy(false); }
  }
  const row = (type: EntryType, hours: number) => ({ user_id: userId, work_date: date!, type, hours, note: null, start_time: null, end_time: null });

  function askAddHours() {
    const h = valid(newHours);
    if (!h) return;
    setPending({
      title: "Mesai eklensin mi?", desc: `${label} gününe ${hrs(h)} ${rules?.isHoliday ? "resmi tatil mesaisi (tatil oranıyla)" : "mesai"} eklenecek.`, yes: "Evet, ekle",
      run: async () => { await mutate.addEntry(row(rules?.workType ?? "overtime", h)); setNewHours(""); toast.success("Mesai eklendi"); void noteMesaiAdded(); },
    });
  }
  function askEdit(e: Entry) {
    const h = valid(editHours);
    if (!h || h === Number(e.hours)) { setEditId(null); return; }
    setPending({
      title: "Saat değişsin mi?", desc: `${hrs(Number(e.hours))} yerine ${hrs(h)} olarak kaydedilecek.`, yes: "Evet, değiştir",
      // Başlangıç saati olan kayıtta çıkış saati de yeni süreye göre kayar (çizelgede eski çıkış kalmasın)
      run: async () => { await mutate.updateEntry(e, e.start_time ? { hours: h, end_time: addHours(hhmm(e.start_time), h) } : { hours: h }); setEditId(null); toast.success("Güncellendi"); },
    });
  }
  function askRemove(e: Entry) {
    const name = isWork(e) && Number(e.hours) > 0 ? `${hrs(Number(e.hours))} ${TYPE_META[e.type].label.toLowerCase()}` : TYPE_META[e.type].label;
    setPending({
      title: "Kayıt silinsin mi?", desc: `${label} gününden "${name}" kaydı silinecek.`, yes: "Evet, sil",
      run: async () => { await mutate.removeEntry(e); toast.success("Silindi"); },
    });
  }
  function askStatus(t: EntryType) {
    const existing = day.find((e) => e.type === t && isStatusRow(e));
    if (existing) return askRemove(existing);
    if (status) return;
    setPending({
      title: `${TYPE_META[t].label} olarak işaretlensin mi?`, desc: `${label} günü "${TYPE_META[t].label}" olarak kaydedilecek.${t === "holiday" && hasWork ? " Bu günün mesaisi resmi tatil oranıyla hesaplanacak." : ""} Bir gün için tek durum seçilebilir.`, yes: "Evet, işaretle",
      run: async () => { await mutate.addEntry(row(t, 0)); toast.success(`${TYPE_META[t].label} eklendi`); },
    });
  }
  const close = () => { setPending(null); setEditId(null); setNewHours(""); onClose(); };
  const sectionTitle = (t: string) => <Txt style={{ fontSize: 14, lineHeight: 20, fontWeight: "600" }}>{t}</Txt>;
  const hint = (t: string) => <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>{t}</Txt>;

  return (
    <Sheet open={!!date} onClose={close} title={label} description="Bu günün kayıtları. Her değişiklikten önce onay istenir." showClose>
      {pending ? (
        <View style={{ gap: 24, borderRadius: 28, backgroundColor: c.muted, padding: 24 }}>
          <View style={{ gap: 8 }}>
            <Txt style={{ fontSize: 20, lineHeight: 27.5, fontWeight: "600" }}>{pending.title}</Txt>
            <Txt muted style={{ fontSize: 16, lineHeight: 26 }}>{pending.desc}</Txt>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Button title="Hayır" variant="secondary" size="xl" disabled={busy} style={{ flex: 1, backgroundColor: c.background }} onPress={() => setPending(null)} />
            <Button title={pending.yes} size="xl" loading={busy} style={{ flex: 1 }} onPress={confirmYes} />
          </View>
        </View>
      ) : (
        <>
          <View style={{ gap: 8 }} accessibilityLabel="Kayıtlar">
            {day.length === 0 ? (
              <View style={{ borderRadius: radius.lg, backgroundColor: c.muted, paddingHorizontal: 16, paddingVertical: 12 }}>
                <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>Bu güne ait kayıt yok.</Txt>
              </View>
            ) : null}
            {day.map((e) => (
              <View key={e.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.lg, backgroundColor: c.muted, paddingHorizontal: 16, paddingVertical: 10 }}>
                {isStatusRow(e) ? <StatusIcon type={e.type} size={28} /> : <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} />}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt style={{ fontSize: 14, lineHeight: 20, fontWeight: "500" }}>{TYPE_META[e.type].label}</Txt>
                  {e.note ? <Txt muted numberOfLines={1} style={{ fontSize: 12, lineHeight: 16, fontStyle: "italic" }}>{e.note}</Txt> : null}
                  {isWork(e) && Number(e.hours) > 0 ? (
                    <Txt muted style={{ fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] }}>
                      {editId === e.id ? "" : hrs(Number(e.hours))}{e.start_time ? ` · ${hhmm(e.start_time)}–${hhmm(e.end_time)}` : ""}
                    </Txt>
                  ) : null}
                </View>
                {editId === e.id ? (
                  <>
                    <Input value={editHours} onChangeText={(t) => setEditHours(t.replace(/[^0-9.,]/g, ""))} keyboardType="decimal-pad" autoFocus
                      style={{ width: 80, textAlign: "center", paddingHorizontal: 8 }} accessibilityLabel="Saat" />
                    <Button title="Kaydet" size="sm" disabled={!valid(editHours)} onPress={() => askEdit(e)} />
                  </>
                ) : (
                  <>
                    {isWork(e) && Number(e.hours) > 0 ? (
                      <IconBtn label="Saati değiştir" onPress={() => { setEditId(e.id); setEditHours(String(Number(e.hours))); }}><Pencil size={16} color={c.foreground} /></IconBtn>
                    ) : null}
                    <IconBtn label="Kaydı sil" onPress={() => askRemove(e)}><Trash2 size={16} color={c.destructive} /></IconBtn>
                  </>
                )}
              </View>
            ))}
          </View>

          <View style={{ gap: 8 }}>
            {sectionTitle("Mesai ekle")}
            {hasWork ? hint("Günde tek mesai kaydı olur. Saati kalem ikonuyla değiştirebilir ya da kaydı silip yenisini ekleyebilirsin.")
              : rules?.off ? hint(`Bu gün "${TYPE_META[rules.off.type].label}" olarak işaretli. Mesai eklemek için önce onu geri al.`)
              : (
                <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                  <Input style={{ flex: 1 }} placeholder="Örn. 2,5" value={newHours} onChangeText={(t) => setNewHours(t.replace(/[^0-9.,]/g, ""))}
                    keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={askAddHours} accessibilityLabel="Mesai saati" />
                  <Button title="Ekle" icon={<Plus size={16} color={c.primaryForeground} />} disabled={!valid(newHours)} onPress={askAddHours} />
                </View>
              )}
          </View>

          <NoteEditor key={primary?.id ?? "none"} entry={primary} />

          <View style={{ gap: 8 }}>
            {sectionTitle("Gün durumu")}
            {[STATUS.slice(0, 2), STATUS.slice(2, 4), STATUS.slice(4)].map((r, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 8 }}>
                {r.map((t) => {
                  const on = day.some((e) => e.type === t && isStatusRow(e));
                  const locked = !on && (!!status || (t !== "holiday" && hasWork));
                  return (
                    <View key={t} style={{ flex: 1 }}>
                      <Pressable disabled={locked} onPress={() => askStatus(t)} accessibilityRole="button" accessibilityState={{ selected: on, disabled: locked }}
                        style={({ pressed }) => ({
                          flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.lg,
                          backgroundColor: on ? c.primary : c.muted, opacity: locked ? 0.45 : 1, transform: [{ scale: pressed ? 0.97 : 1 }],
                        })}>
                        <StatusIcon type={t} size={24} />
                        <Txt style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: on ? c.primaryForeground : c.foreground }}>{TYPE_META[t].label}</Txt>
                      </Pressable>
                    </View>
                  );
                })}
                {r.length === 1 ? <View style={{ flex: 1 }} /> : null}
              </View>
            ))}
            {status ? hint("Bir gün için tek durum seçilebilir; değiştirmek için önce seçili olanı geri al.")
              : hasWork ? hint("Bu gün mesai var; izin/rapor işaretlemek için önce mesaiyi sil.") : null}
          </View>
        </>
      )}
    </Sheet>
  );
}

