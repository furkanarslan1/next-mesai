import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: `Yardım ve destek · ${LEGAL.app}` };

/** App Store "Support URL": iletişim bilgisi + sık sorulanlar (giriş gerektirmez). */
export default function SupportPage() {
  const L = LEGAL;
  return (
    <>
      <h1>{L.app} yardım ve destek</h1>
      <p>
        Bir sorun mu yaşıyorsun ya da önerin mi var? <a href={`mailto:${L.email}`}>{L.email}</a> adresine yaz.
        Genellikle 2 iş günü içinde dönüş yapılır. E-postana uygulama sürümünü ve telefon modelini eklersen sorunu daha hızlı çözebiliriz.
      </p>

      <h2>Sık sorulanlar</h2>

      <h3 className="mt-4 font-semibold">Mesaimi nasıl kaydederim?</h3>
      <p>Ana sayfadaki kısayollara (ör. 2,5 saat) dokun ya da “Farklı mesai” ile saati gir. Geçmiş bir gün için önce tarihi seç.</p>

      <h3 className="mt-4 font-semibold">Kazancım nasıl hesaplanıyor?</h3>
      <p>
        Ayarlar → Ücret ve hedef’e girdiğin maaş, saatlik ücret ve hafta içi / pazar / resmi tatil oranlarıyla hesaplanır.
        Brüt ↔ net hesabı güncel bordro parametreleriyle yaklaşık sonuç verir. Hesaplamalar bilgi amaçlıdır; resmi bordron esastır.
      </p>

      <h3 className="mt-4 font-semibold">Şifremi unuttum</h3>
      <p>Giriş ekranında “Şifremi unuttum”a dokun; e-postana sıfırlama bağlantısı gelir. Giriş yapmışsan Ayarlar → Hesap → Şifreyi değiştir.</p>

      <h3 className="mt-4 font-semibold">Verilerim güvende mi? Yöneticim maaşımı görür mü?</h3>
      <p>
        Verilerin yalnızca senin hesabında saklanır; reklam ve takip yoktur. Bir yöneticiye bağlanırsan yalnızca adını ve
        mesai/izin kayıtlarını görür; maaş, ücret, hedef ve gelir-gider bilgilerin asla gösterilmez.
        Ayrıntılar: <a href="/privacy">Gizlilik politikası</a>.
      </p>

      <h3 className="mt-4 font-semibold">Verilerimi yedekleyebilir miyim?</h3>
      <p>Ayarlar → Yedekle ve geri yükle’den JSON yedeği, Raporlar’dan Excel / PDF / CSV çıktısı alabilirsin.</p>

      <h3 className="mt-4 font-semibold">Hesabımı nasıl silerim?</h3>
      <p>Ayarlar → Hesap → Hesabı sil. Uygulamaya erişemiyorsan: <a href="/delete-account">Hesap ve veri silme</a>.</p>
    </>
  );
}
