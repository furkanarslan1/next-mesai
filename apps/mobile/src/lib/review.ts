/**
 * Mağaza puan isteği (App Store / Google Play'in kendi yerel penceresi; uygulamadan çıkmadan yıldız verilir).
 * Ne zaman sorulacağı `@mesai/core/review`'da. Sayaç cihazda (AsyncStorage) tutulur. Apple kuralları: kendi
 * "bizi sever misin?" ön sorumuz yok, ödül/teşvik yok; pencereyi gösterip göstermemeye sistem karar verir.
 * TestFlight'ta ve Expo Go'da pencere çıkmaz; Android'de yalnızca Play'den kurulan uygulamada çalışır.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EMPTY_REVIEW, markAsked, noteAdd, shouldAskReview, type ReviewState } from "@mesai/core/review";
import Constants from "expo-constants";
import * as StoreReview from "expo-store-review";

const KEY = "mesai.review";
const version = () => Constants.expoConfig?.version ?? "0";

async function read(): Promise<ReviewState> {
  try { return { ...EMPTY_REVIEW, ...JSON.parse((await AsyncStorage.getItem(KEY)) ?? "{}") }; }
  catch { return EMPTY_REVIEW; }
}
const write = (s: ReviewState) => AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});

/**
 * Mesai başarıyla eklendikten sonra çağrılır. `canAsk` false ise yalnızca sayılır (ör. ekranda "Geri al"
 * düğmeli bildirim varken pencere açılmasın). Hiçbir hata kullanıcıya yansımaz.
 */
export async function noteMesaiAdded(canAsk = true) {
  try {
    const now = new Date();
    let s = noteAdd(await read(), now);
    if (canAsk && shouldAskReview(s, now, version()) && (await StoreReview.hasAction())) {
      s = markAsked(s, now, version());
      await write(s);
      // Başarı bildirimi ve titreşim bitsin, sonra pencere
      setTimeout(() => { void StoreReview.requestReview().catch(() => {}); }, 1500);
      return;
    }
    await write(s);
  } catch { /* puan isteği hiçbir akışı bozmamalı */ }
}
