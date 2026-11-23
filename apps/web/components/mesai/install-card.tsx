"use client";

import { useSyncExternalStore } from "react";
import { Download, Share, Smartphone, SquarePlus } from "lucide-react";
import { useInstall } from "@/lib/install";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Android uygulamasının (APK) indirme adresi; boşsa APK düğmesi gösterilmez (EAS Build çıktısı) */
const APK_URL = process.env.NEXT_PUBLIC_ANDROID_APK_URL ?? "";
const noop = () => () => {};
const isAndroid = () => /Android/i.test(navigator.userAgent);

/**
 * "Uygulamayı indir" bölümü: kuruluysa görünmez; Android/Chrome'da tek dokunuş, iOS'ta adım adım anlatım.
 * Android'de APK adresi tanımlıysa yerel uygulamayı indirme düğmesi de çıkar (iPhone'a yerel uygulama
 * yalnızca App Store / TestFlight ile kurulabildiği için iPhone'da ana ekrana ekleme anlatılır).
 */
export function InstallCard({ className }: { className?: string }) {
  const { state, install } = useInstall();
  const android = useSyncExternalStore(noop, isAndroid, () => false);
  if (state === "unknown" || state === "installed") return null;

  return (
    <Card className={className}>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center r-md bg-primary/15 text-primary ring-1 ring-primary/30">
            <Download className="size-5" />
          </span>
          <div>
            <p className="font-semibold leading-tight">Uygulamayı indir</p>
            <p className="text-xs text-muted-foreground">Ana ekranına ekle, tam ekran ve daha hızlı aç.</p>
          </div>
        </div>
        {android && APK_URL && (
          <div className="space-y-1.5">
            <a href={APK_URL} download className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              <Smartphone className="size-4" />Android uygulamasını indir (APK)
            </a>
            <p className="text-xs text-muted-foreground">İndirince dosyayı aç; telefon sorarsa &quot;bu kaynaktan yüklemeye izin ver&quot;i onayla.</p>
          </div>
        )}
        {state === "prompt" && <Button className="w-full" variant={android && APK_URL ? "secondary" : "default"} onClick={install}><Download className="size-4" />{android && APK_URL ? "Ya da web sürümünü yükle" : "Yükle"}</Button>}
        {state === "ios" && (
          <ol className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><Share className="size-4 shrink-0 text-primary" />Safari&apos;de alttaki <b>Paylaş</b> düğmesine dokun</li>
            <li className="flex items-center gap-2"><SquarePlus className="size-4 shrink-0 text-primary" /><b>Ana Ekrana Ekle</b>&apos;yi seç, sonra <b>Ekle</b></li>
          </ol>
        )}
        {state === "manual" && (
          <p className="text-sm text-muted-foreground">
            Tarayıcı menüsünden (⋮) <b className="text-foreground">Uygulamayı yükle</b> ya da <b className="text-foreground">Ana ekrana ekle</b> seçeneğini kullan. iPhone&apos;da Safari ile aç.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
