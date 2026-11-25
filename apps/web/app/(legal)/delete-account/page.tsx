import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: `Hesap ve veri silme · ${LEGAL.app}` };

/** Google Play'in istediği web üzerinden hesap silme talebi sayfası (uygulamayı yüklemeden de kullanılabilir). */
export default function DeleteAccountPage() {
  const L = LEGAL;
  return (
    <>
      <h1>{L.app} hesabını ve verilerini silme</h1>
      <p>{L.app} uygulaması ({L.owner}) hesabını ve tüm verilerini aşağıdaki yollardan biriyle kalıcı olarak silebilirsin.</p>

      <h2>1. Uygulamadan ya da web’den (hemen)</h2>
      <ul>
        <li>Mobil uygulamada: <b>Ayarlar → Hesap → Hesabı sil</b>, onay için “SİL” yaz.</li>
        <li>Web’de: <a href="/login">giriş yap</a>, sonra <a href="/profile/account">Ayarlar → Hesap</a> sayfasından aynı adımı uygula.</li>
      </ul>

      <h2>2. E-posta ile (uygulamaya erişemiyorsan)</h2>
      <p>
        Hesabına kayıtlı e-posta adresinden <b>{L.email}</b> adresine “Hesap silme talebi” konulu bir e-posta gönder.
        Talebin en geç 30 gün içinde yerine getirilir ve sana bildirilir.
      </p>

      <h2>Neler silinir?</h2>
      <ul>
        <li>Hesap bilgilerin (e-posta, ad, şifre),</li>
        <li>tüm mesai, izin, rapor ve tatil kayıtların ve notların,</li>
        <li>maaş, ücret, hedef, gelir/gider ve bordro bilgilerin,</li>
        <li>kısayolların ve yönetici bağlantıların.</li>
      </ul>
      <p>
        Silme kalıcıdır ve geri alınamaz. Verilerin hemen silinir; sağlayıcının teknik yedeklerinde kısa bir süre daha
        kalabilir ve süresi dolunca otomatik silinir. Ayrıca saklamamız gereken bir veri yoktur.
      </p>
    </>
  );
}
