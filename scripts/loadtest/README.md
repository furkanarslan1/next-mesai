# Yük testi (16:00 senaryosu)

Bir iterasyon = bir kullanıcının uygulamayı açması (profil, ayarlar, kısayollar, toplam mesai RPC, bu ayın kayıtları) + bir mesai kaydı.
Test kayıtları 2019 tarihine yazılır (bu ayın sorgusu gerçekçi boyutta kalsın); `teardown` hepsini siler.

**Asla canlı projede çalıştırma** — kotayı (MAU, DB boyutu, egress) ve gerçek kullanıcıları etkiler.

```sh
cd scripts/loadtest
export LOADTEST_REF=<test projesi ref>
node setup.mjs                       # 25 kullanıcı (Auth kayıt sınırı: IP başına ~30 / 5 dk)
eval "$(node --input-type=module -e 'import {URL,KEY} from "./env.mjs"; console.log(`export URL=${URL} KEY=${KEY}`)')"
k6 run -e URL=$URL -e KEY=$KEY -e PEAK=30 test.js   # PEAK = iterasyon/sn (x6 istek)
node teardown.mjs                    # sahte kullanıcıları ve kayıtlarını sil
```

Token'lar 1 saat geçerli; daha uzun ara verilirse teardown öncesi `setup` yeniden gerekmez ama token süresi dolmuşsa kullanıcılar elle silinmeli (Auth panelinde `loadtest-` ile ara).

## Sonuçlar (2026-11-26, ücretsiz Nano, Singapur, Türkiye'den)

- ~180 istek/sn (30 kayıt/sn): hatasız, p95 0,26 sn (çoğu ağ gecikmesi).
- ~330 istek/sn: kuyruk, %13 zaman aşımı. ~480 istek/sn: p95 25 sn.
- `total_overtime_hours` DB süresinin ~%83'üydü → 0017 index'i: 42,9 ms → 1,25 ms.
- **Dikkat:** art arda testlerden sonra proje ~10 dk yanıt vermedi (DB boştaydı; Auth/PostgREST takıldı),
  sonra kendiliğinden düzeldi. Muhtemelen paylaşımlı/burst CPU'nun tükenmesi (doğrulanmadı).
  Ücretsiz projede testleri arka arkaya koşma; aralarında 15+ dk bekle, geliştirmede kullandığın projede yapma.
