/**
 * Yerel bildirimler (sunucu yok): akşam hatırlatıcısı ve çıkış saati. Plan `@mesai/core/notify`'da hesaplanır;
 * burada telefona kurulur. Bildirim anında uygulama çalışmadığından plan önceden (14 gün) kurulur ve kayıtlar,
 * ayarlar ya da gün değişince yeniden kurulur: kaydı olan günün bildirimi böylece hiç gelmez.
 */
import { planReminders } from "@mesai/core/notify";
import { DEFAULT_SETTINGS } from "@mesai/core/settings";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";
import { usePrefs, usePrefsReady } from "./prefs";
import { monthKey, useMonthEntries, useSettings } from "./store";
import { useToday } from "./now";

const CHANNEL = "reminders";
const OURS = /^(evening|exit)-\d{4}-\d{2}-\d{2}$/;
const supported = Platform.OS === "android" || Platform.OS === "ios";

if (supported) {
  // Uygulama açıkken gelen bildirim de üstte görünsün
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

async function ensureChannel() {
  if (Platform.OS !== "android") return;
  // Android 13+: izin penceresi ancak en az bir kanal varken çıkar
  await Notifications.setNotificationChannelAsync(CHANNEL, { name: "Hatırlatmalar", importance: AndroidImportance.HIGH });
}

/** Bildirim izni (gerekirse sorar). Reddedilmiş ve tekrar sorulamıyorsa false. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  try {
    await ensureChannel();
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    if (!cur.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch { return false; }
}

let running: Promise<void> = Promise.resolve();
/** Bizim kurduğumuz bildirimleri silip planı yeniden kurar (sıra ile: üst üste çağrılar karışmasın). */
function apply(plan: ReturnType<typeof planReminders>) {
  running = running.then(async () => {
    try {
      const all = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(all.filter((n) => OURS.test(n.identifier)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
      if (!plan.length) return;
      const perm = await Notifications.getPermissionsAsync();
      if (!perm.granted) return;
      await ensureChannel();
      for (const p of plan) {
        await Notifications.scheduleNotificationAsync({
          identifier: p.id,
          content: { title: p.title, body: p.body },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: CHANNEL },
        });
      }
    } catch { /* bildirim kurulamazsa uygulama çalışmaya devam eder */ }
  });
}

/** Sekmelerin kökünde çalışır: tercihler, ayarlar, bu ayın kayıtları ya da gün değişince planı yeniler. */
export function useReminderSync() {
  const prefs = usePrefs();
  const ready = usePrefsReady();
  const settings = useSettings();
  const today = useToday();
  const entries = useMonthEntries(monthKey(today));
  const s = settings ?? DEFAULT_SETTINGS;
  const plan = ready && settings && entries
    ? planReminders(new Date(), { evening: prefs.reminderOn, eveningHour: prefs.reminderHour, dismissed: prefs.reminderDismissed, exit: prefs.exitReminderOn }, s, entries)
    : null;
  // Plan değişmedikçe yeniden kurma (her çizimde değil)
  const sig = plan ? plan.map((p) => `${p.id}@${+p.at}`).join("|") : null;
  useEffect(() => {
    if (!supported || sig === null || !plan) return;
    apply(plan);
    // plan, sig ile aynı içeriği taşır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
}
