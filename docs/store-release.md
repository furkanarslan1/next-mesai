# Mağaza yayını: Google Play ve App Store

Bu belge iki mağazaya çıkış için gerekenleri, kodda yapılanları ve konsollara girilecek cevapları toplar.
Konsollardaki formlar buradan kopyalanabilir. Politika özetleri 25 Kasım 2026'da doğrulandı; göndermeden önce
konsoldaki güncel metne bir kez daha bakılmalı.

## 1. Kodda yapılanlar (chore/store-readiness)

- Herkese açık yasal sayfalar (giriş gerektirmez):
  - Gizlilik politikası + KVKK aydınlatma metni: `https://next-mesai.vercel.app/privacy`
  - Kullanım koşulları: `https://next-mesai.vercel.app/terms`
  - Hesap ve veri silme (Google Play'in istediği web bağlantısı): `https://next-mesai.vercel.app/delete-account`
  - Geliştirici adı ve destek e-postası `apps/web/lib/legal.ts` içinde. **Yayından önce doldurulmalı.**
- Uygulama içinden bağlantılar: Ayarlar → Gizlilik politikası / Kullanım koşulları; kayıt ekranında bilgilendirme.
- Uygulama içi hesap silme zaten var: Ayarlar → Hesap → Hesabı sil (sunucudaki tüm veri zincirleme silinir).
- Mobil kayıttan "Yönetici" seçeneği kaldırıldı (ekip paneli yalnızca web'de; mobilde çıkmaz sokak olmasın).
- Android: gereksiz depolama izinleri engellendi (`blockedPermissions`); hedef API 36 (Android 16), Play'in
  31 Ağustos 2026 şartını karşılıyor. Production profili AAB üretir.
- iOS: `ITSAppUsesNonExemptEncryption: false` (şifreleme beyanı), gizlilik manifesti (required reason API'ler
  kütüphanelerin kendi PrivacyInfo dosyalarından toplandı), `supportsTablet: false` (yalnızca iPhone).
- Kullanılmayan yerel paketler kaldırıldı: expo-image, expo-device, expo-web-browser, expo-symbols.

## 2. Senin yapman gerekenler

### Hesaplar
- **Google Play Console** (bir kerelik 25 USD). Kişisel hesap 13 Kasım 2023'ten sonra açıldıysa:
  production'dan önce **en az 12 test kullanıcısıyla 14 gün kesintisiz kapalı test** zorunlu.
  Kuruluş (şirket) hesabı bu kuraldan muaf, ancak D-U-N-S numarası ister.
- **Apple Developer Program** (yıllık 99 USD). Bireysel hesapta mağazada adın görünür.

### Karar verilmesi gerekenler
- Mağaza adı. "Mesai" büyük ihtimalle App Store'da alınmıştır (App Store'da ad benzersiz olmalı).
  Öneri: **"Mesai – Fazla Mesai Takip"** (30 karakter sınırı).
- Destek e-postası ve geliştirici adı (yasal sayfalarda ve mağazada aynı olmalı).
- Veritabanı bölgesi (aşağıda "Açık riskler").

### İnceleme için demo hesap (App Store zorunlu, Play'de önerilir)
- Örnek verili bir çalışan hesabı (ör. birkaç mesai, izin, gelir/gider kaydı). Kimlik bilgileri yalnızca
  App Store Connect → App Review Information'a yazılır, açıklamaya ya da ekran görüntüsüne değil.

### Görseller
- Play: 512×512 ikon, 1024×500 öne çıkan görsel, en az 2 telefon ekran görüntüsü.
- App Store: 6,9" iPhone ekran görüntüleri (1320×2868 veya 1290×2796), en az 1, en çok 10.
- Önerilen ekranlar: Ana sayfa (hedef halkası), Takvim, Raporlar özeti, Brüt↔net, Bildirim ayarı.

## 3. Mağaza metinleri (taslak)

**Kısa açıklama (Play, 80 karakter):**
Fazla mesaini, iznini ve kazancını kolayca takip et; ay sonu maaşını önceden gör.

**Alt başlık (App Store, 30 karakter):** Mesai, izin ve maaş takibi

**Uzun açıklama:**
Mesai, fazla mesaini tek dokunuşla kaydetmen ve ay sonunda ne kadar kazanacağını önceden görmen için tasarlandı.

• Tek dokunuşla mesai: sık yaptığın saatleri kısayol yap ya da çıkış saatinle otomatik hesaplat.
• Doğru ücret: hafta içi, pazar ve resmi tatil oranları, maaşa dahil mesai, raporlu gün düşümü.
• Hedef halkası: aylık hedef maaşına ya da mesai saatine ne kadar kaldığını, günde kaç saat gerektiğini gör.
• Takvim: izin, rapor, gelmedim ve resmi tatilleri işaretle; birden çok günü tek seferde seç.
• Vardiya döngüsü: haftalık değişen vardiyanı bir kez gir, uygulama her gün doğru saati bilsin.
• Brüt ↔ net: güncel bordro parametreleriyle aydan aya net maaşını hesapla.
• Raporlar: haftalık/aylık/yıllık özet, puantaj çizelgesi, Excel/PDF dışa aktarma, bordro kontrolü.
• Gelir-gider: harcamalarını gir, ay sonunda cebinde ne kaldığını gör.
• Hatırlatıcılar: akşam ve çıkış saatinde, kayıt girmediysen bildirim.
• Gizlilik: reklam yok, takip yok. Maaş bilgilerin yöneticine asla gösterilmez.

Hesaplamalar bilgi amaçlıdır; resmi bordron esastır.

**Anahtar kelimeler (App Store, 100 karakter):**
mesai,fazla mesai,puantaj,maaş,bordro,izin,vardiya,brüt net,çalışma saati,hesaplama

**Kategori:** Verimlilik (Productivity); ikincil: Finans
**Destek URL'si:** https://next-mesai.vercel.app/privacy (ya da ayrı bir destek sayfası)
**Gizlilik politikası URL'si:** https://next-mesai.vercel.app/privacy

## 4. Google Play: App content formları

### Data safety
- Veri toplanıyor mu: **Evet**. Üçüncü taraflarla paylaşılıyor mu: **Hayır** (Supabase/Vercel/Expo hizmet
  sağlayıcısıdır; Google'ın tanımında "paylaşım" sayılmaz).
- Aktarım sırasında şifreleniyor: **Evet**. Kullanıcı silme isteyebilir: **Evet**,
  web bağlantısı: `https://next-mesai.vercel.app/delete-account`.
- Toplanan veri türleri (hepsi: zorunlu, amaç "Uygulama işlevselliği" + "Hesap yönetimi", kullanıcıya bağlı):
  - Kişisel bilgiler → **Ad**, **E-posta adresi**
  - Finansal bilgiler → **Diğer finansal bilgiler** (maaş, ücret, gelir/gider, bordro)
  - Uygulama etkinliği → **Diğer kullanıcı tarafından oluşturulan içerik** (mesai/izin kayıtları, notlar)
- Toplanmayanlar: konum, rehber, fotoğraf, sağlık, cihaz kimliği, reklam kimliği, analiz verisi.

### Diğer beyanlar
- Hesap silme: uygulama hesap oluşturuyor → **Evet**, uygulama içi yol + web bağlantısı.
- Reklam: **Yok**. Hedef kitle: **18+** (ya da 16+; çocuklara yönelik değil).
- İçerik derecelendirmesi anketi: şiddet/kumar/kullanıcı etkileşimi yok → en düşük derece beklenir.
- Finansal özellikler beyanı: uygulama banka/kredi/ödeme/yatırım hizmeti **sunmuyor**; kişisel takip aracı.
- Uygulama erişimi: giriş gerekiyor → demo hesap bilgileri bu bölüme girilir.

## 5. App Store Connect: App Privacy

- Takip (tracking): **Hayır**.
- Toplanan veriler (hepsi "kimliğe bağlı", amaç **App Functionality**, takip için kullanılmıyor):
  - Contact Info → **Name**, **Email Address**
  - Financial Info → **Other Financial Info**
  - User Content → **Other User Content**
- İnceleme notu (App Review Information → Notes), taslak:
  > Mesai, çalışanların fazla mesai, izin ve kazançlarını takip ettiği kişisel bir araçtır. Giriş için demo
  > hesap aşağıdadır. Hesap silme: Ayarlar → Hesap → Hesabı sil. Yönetici paneli yalnızca web sitesindedir;
  > mobil uygulama çalışanlar içindir. Uygulama içi satın alma yoktur.
- Yaş derecelendirmesi anketi: hepsine "Yok" → en düşük derece.
- Şifreleme: app.json'da beyan edildi (muaf), ayrıca soru gelmez.

## 6. Açık riskler

1. **Veritabanı Singapur'da (Supabase ap-southeast-1).** Kullanıcılar Türkiye'de olduğundan:
   - Gecikme: her istek Singapur'a gidip gelir (Frankfurt'a göre kabaca 3-4 kat uzak). Önbellek bunu büyük
     ölçüde gizliyor ama kayıt ekleme ve ilk açılış daha yavaş.
   - KVKK m. 9: yurt dışına aktarım için standart sözleşme ve Kurul'a bildirim gibi şartlar var; bölge AB
     olsa da aktarım yine yurt dışıdır, fark yalnızca gecikmede.
   - Bölge sonradan değiştirilemez; yeni projeye taşımak gerekir. Bunu **kullanıcılar gelmeden** yapmak en ucuzu.
2. **KVKK yükümlülükleri** (VERBİS kaydı, yurt dışı aktarım bildirimi) işin büyüklüğüne ve yapısına göre
   değişir; bir hukukçuya danışılması önerilir. Yasal metinler taslaktır, hukuki görüş değildir.
3. **Play kapalı testi**: 12 kişi, 14 gün. Erken başlamak takvimi kısaltır (arkadaş, iş yeri çevresi).
