import { Suspense } from "react";
import { BottomNav } from "@/components/mesai/bottom-nav";
import { Toaster } from "@/components/ui/sonner";

// Kabuk tamamen statik: oturum zaten proxy.ts'te korunuyor, profil/rol istemci önbelleğinden geliyor.
// Böylece sayfalar arası geçişte sunucu beklenmez, menü hiç gecikmez.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl gap-6 xl:max-w-3xl 2xl:max-w-4xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] md:pb-6">
        <Suspense fallback={<div className="hidden w-56 shrink-0 md:block xl:hidden" />}><BottomNav /></Suspense>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      {/* Geniş ekranda (xl+) kenar çubuğu sabit solda, içerik ekranın tam ortasında; Toaster flex kutusunun dışında: içindeki görünmez kutu da gap-6 boşluğu yiyordu ve içerik sola yaslanıyordu */}
      <Toaster />
    </>
  );
}
