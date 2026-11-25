import Link from "next/link";
import { LEGAL } from "@/lib/legal";

/** Herkese açık yasal sayfalar (giriş gerektirmez): mağaza kayıtlarındaki bağlantılar buraya gelir. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-[calc(2rem+env(safe-area-inset-top))]">
      <nav className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <Link href="/login" className="font-semibold text-foreground">{LEGAL.app}</Link>
        <Link href="/privacy">Gizlilik</Link>
        <Link href="/terms">Kullanım koşulları</Link>
        <Link href="/delete-account">Hesap silme</Link>
      </nav>
      <article className="legal space-y-4 text-[15px] leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_a]:underline">
        {children}
      </article>
      <p className="mt-10 text-xs text-muted-foreground">Son güncelleme: {LEGAL.updated} · İletişim: {LEGAL.email}</p>
    </main>
  );
}
