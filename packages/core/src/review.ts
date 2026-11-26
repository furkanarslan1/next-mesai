/**
 * Mağaza puan isteği ne zaman gösterilsin (Apple/Google sistemi ayrıca kendi sınırını uygular: iOS'ta yılda
 * en çok 3 kez gösterir, istek her zaman pencere açacağı anlamına gelmez). Kural: kullanıcı uygulamayı gerçekten
 * kullanmış olsun (en az 10 mesai, ilk mesaiden en az 7 gün sonra), bir sürümde en çok bir kez ve iki istek
 * arasında en az 120 gün olsun. Yalnızca olumlu bir anda (mesai kaydı başarıyla eklendikten sonra) çağrılır.
 */
export const REVIEW_RULES = { minAdds: 10, minDays: 7, gapDays: 120 };

export interface ReviewState {
  /** İlk mesai kaydının zamanı (ISO) */
  firstSeen: string | null;
  /** Başarıyla eklenen mesai sayısı */
  adds: number;
  lastAsked: string | null;
  askedVersion: string | null;
}
export const EMPTY_REVIEW: ReviewState = { firstSeen: null, adds: 0, lastAsked: null, askedVersion: null };

const DAY = 86_400_000;

/** Bir mesai eklendi: sayaç ve ilk görülme güncellenir. */
export const noteAdd = (s: ReviewState, now: Date): ReviewState =>
  ({ ...s, adds: s.adds + 1, firstSeen: s.firstSeen ?? now.toISOString() });

export function shouldAskReview(s: ReviewState, now: Date, version: string, r = REVIEW_RULES): boolean {
  if (s.adds < r.minAdds || !s.firstSeen) return false;
  if (now.getTime() - Date.parse(s.firstSeen) < r.minDays * DAY) return false;
  if (s.askedVersion === version) return false;
  if (s.lastAsked && now.getTime() - Date.parse(s.lastAsked) < r.gapDays * DAY) return false;
  return true;
}

export const markAsked = (s: ReviewState, now: Date, version: string): ReviewState => ({ ...s, lastAsked: now.toISOString(), askedVersion: version });
