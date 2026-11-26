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
