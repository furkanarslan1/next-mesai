"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { useInstall } from "@/lib/install";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** "Uygulamayı indir" bölümü: kuruluysa görünmez; Android/Chrome'da tek dokunuş, iOS'ta adım adım anlatım. */
export function InstallCard({ className }: { className?: string }) {
  const { state, install } = useInstall();
  if (state === "unknown" || state === "installed") return null;

  return (
    <Card className={className}>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Download className="size-5" />
          </span>
          <div>
            <p className="font-semibold leading-tight">Uygulamayı indir</p>
            <p className="text-xs text-muted-foreground">Ana ekranına ekle, tam ekran ve daha hızlı aç.</p>
          </div>
        </div>
        {state === "prompt" && <Button className="w-full" onClick={install}><Download className="size-4" />Yükle</Button>}
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
