import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: `Gizlilik Politikası · ${LEGAL.app}` };

export default function PrivacyPage() {
  const L = LEGAL;
  return (
    <>
      <h1>Gizlilik Politikası ve KVKK Aydınlatma Metni</h1>
      <p>
        Bu metin, {L.app} mobil uygulaması ve web sitesi ({L.site}) üzerinden işlenen kişisel verileri, 6698 sayılı
        Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında açıklar. Veri sorumlusu: <b>{L.owner}</b> ({L.email}).
      </p>

      <h2>Hangi verileri işliyoruz?</h2>
      <ul>
        <li><b>Hesap bilgileri:</b> e-posta adresin, adın ve şifren (şifre yalnızca şifrelenmiş/özetlenmiş olarak saklanır, kimse göremez).</li>
        <li><b>Çalışma kayıtları:</b> mesai saatleri, izin, rapor, devamsızlık ve resmi tatil kayıtları, notların, çalışma saatin ve vardiya bilgin.</li>
        <li><b>Ücret ve finans bilgileri:</b> maaşın, saatlik ücret ve oranların, aylık hedefin, maaş günün, girdiğin gelir/gider kalemleri ve bordro bilgileri.</li>
        <li><b>Yönetici bağlantısı:</b> bir yöneticiyle bağlantı kurarsan bağlantı durumu.</li>
      </ul>
      <p>
        Reklam, analiz veya takip aracı kullanmıyoruz; konumunu, rehberini, fotoğraflarını ya da cihaz kimliklerini toplamıyoruz.
        Verilerini satmıyor, reklam amacıyla kimseyle paylaşmıyoruz.
      </p>

      <h2>Cihazında kalan veriler</h2>
      <p>
        Uygulamanın hızlı açılması için son verilerinin bir kopyası, tema ve hatırlatıcı tercihlerin ve kurulan
        hatırlatma bildirimleri yalnızca telefonunda/tarayıcında saklanır. Çıkış yapınca ya da uygulamayı silince kaldırılır.
      </p>

      <h2>Neden işliyoruz? (amaç ve hukuki sebep)</h2>
      <ul>
        <li>Hesabını oluşturmak, girişini sağlamak ve kayıtlarını cihazların arasında eşitlemek,</li>
        <li>mesai, kazanç, hedef ve raporlarını hesaplayıp göstermek,</li>
        <li>destek taleplerine yanıt vermek ve hizmetin güvenliğini sağlamak.</li>
      </ul>
      <p>
        Bu işleme, KVKK m. 5/2-c (bir sözleşmenin kurulması veya ifası: uygulamayı kullanman) ve m. 5/2-f (meşru menfaat:
        hizmetin güvenliği) hukuki sebeplerine dayanır. Verilerin yalnızca bu amaçlar için kullanılır.
      </p>

      <h2>Yönetici paneli</h2>
      <p>
        Bir yöneticinin davetini kabul edersen o yönetici yalnızca <b>adını ve mesai/izin kayıtlarını</b> görebilir.
        Maaşın, ücretlerin, hedefin ve gelir/gider bilgilerin yöneticiye <b>hiçbir zaman</b> gösterilmez.
        Bağlantıyı istediğin zaman Ayarlar → Yönetici bölümünden kaldırabilirsin.
      </p>

      <h2>Verilerin nerede saklanıyor? (yurt dışına aktarım)</h2>
      <p>
        Verilerin, hizmet sağlayıcılarımızın sunucularında saklanır: veritabanı ve kimlik doğrulama için <b>Supabase</b>
        ({L.dataRegion}), web sitesi için <b>Vercel</b>, uygulama güncellemelerinin dağıtımı için <b>Expo</b>.
        Bu sağlayıcılar Türkiye dışında bulunduğundan verilerin yurt dışına aktarılır. Aktarım, KVKK m. 9’a uygun
        olarak yapılır. Sağlayıcılar verilerini yalnızca bizim adımıza, hizmeti sunmak için işler.
        Tüm bağlantılar şifrelidir (HTTPS/TLS).
      </p>

      <h2>Ne kadar süre saklıyoruz?</h2>
      <p>
        Verilerin hesabın açık olduğu sürece saklanır. Hesabını sildiğinde tüm kayıtların (çalışma, ücret, gelir/gider,
        bordro, bağlantılar) <b>hemen ve kalıcı olarak</b> silinir. Sağlayıcının teknik yedeklerinde kısa bir süre daha
        bulunabilir; bu yedekler süresi dolunca otomatik olarak silinir.
      </p>

      <h2>Hesabını ve verilerini silme</h2>
      <p>
        Uygulamada <b>Ayarlar → Hesap → Hesabı sil</b> ile tüm verilerini kalıcı olarak silebilirsin. Uygulamaya
        erişemiyorsan <a href="/delete-account">hesap silme sayfasındaki</a> adımları izleyebilirsin. Silmeden önce
        Ayarlar → Veri bölümünden verilerini dışa aktarabilirsin.
      </p>

      <h2>Hakların (KVKK m. 11)</h2>
      <p>
        Kişisel verilerinin işlenip işlenmediğini öğrenme, bilgi talep etme, amacını öğrenme, aktarıldığı kişileri bilme,
        eksik/yanlış ise düzeltilmesini, silinmesini isteme, itiraz etme ve zarara uğradıysan giderilmesini talep etme
        haklarına sahipsin. Taleplerini {L.email} adresine iletebilirsin; en geç 30 gün içinde yanıtlanır.
      </p>

      <h2>Çocuklar</h2>
      <p>Uygulama çalışanlara yöneliktir; 16 yaşından küçüklere yönelik değildir ve onlardan bilerek veri toplanmaz.</p>

      <h2>Değişiklikler</h2>
      <p>Bu metni güncellediğimizde sayfanın altındaki tarih değişir; önemli değişiklikleri uygulama içinde duyururuz.</p>
    </>
  );
}
