import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: `Kullanım Koşulları · ${LEGAL.app}` };

export default function TermsPage() {
  const L = LEGAL;
  return (
    <>
      <h1>Kullanım Koşulları</h1>
      <p>{L.app} uygulamasını ve web sitesini kullanarak aşağıdaki koşulları kabul etmiş olursun. Hizmeti sunan: {L.owner} ({L.email}).</p>

      <h2>Hizmet</h2>
      <p>
        {L.app}; mesai, izin, kazanç, hedef ve gelir/gider kayıtlarını tutmana ve bunlardan hesaplamalar görmene yarayan
        kişisel bir takip aracıdır. Hizmet şu an ücretsizdir; özellikler zamanla değişebilir.
      </p>

      <h2>Hesaplamalar bilgi amaçlıdır</h2>
      <p>
        Mesai ücreti, ay sonu tahmini, brüt/net maaş ve bordro karşılaştırması gibi hesaplamalar, senin girdiğin bilgilere
        ve genel kurallara dayanan <b>yaklaşık</b> sonuçlardır. Hukuki, mali veya muhasebe danışmanlığı yerine geçmez;
        resmi bordron ve işvereninin kayıtları esastır. Hesaplamalardaki olası farklardan doğan sonuçlardan sorumluluk kabul edilmez.
      </p>

      <h2>Hesabın ve sorumlulukların</h2>
      <ul>
        <li>Hesap bilgilerini doğru vermek ve şifreni korumak senin sorumluluğundadır.</li>
        <li>Uygulamayı yalnızca yasalara uygun amaçlarla kullanmalısın; başkalarının verilerini izinsiz girmemelisin.</li>
        <li>Hizmeti kötüye kullanan (ör. sisteme saldıran) hesaplar kapatılabilir.</li>
      </ul>

      <h2>Hizmetin sürekliliği</h2>
      <p>
        Hizmeti kesintisiz sunmaya çalışırız ancak bakım, sağlayıcı arızaları veya ağ sorunları nedeniyle geçici kesintiler
        olabilir. Verilerini düzenli olarak Ayarlar → Veri bölümünden dışa aktarmanı öneririz.
      </p>

      <h2>Hesabı kapatma</h2>
      <p>Hesabını istediğin zaman uygulamada Ayarlar → Hesap → Hesabı sil ile kapatabilirsin; verilerin kalıcı olarak silinir.</p>

      <h2>Gizlilik</h2>
      <p>Verilerinin nasıl işlendiği <a href="/privacy">Gizlilik Politikası ve KVKK Aydınlatma Metni</a>’nde anlatılır.</p>

      <h2>Değişiklikler ve uygulanacak hukuk</h2>
      <p>Koşullar güncellenebilir; güncel metin bu sayfada yayımlanır. Bu koşullara Türkiye Cumhuriyeti hukuku uygulanır.</p>
    </>
  );
}
