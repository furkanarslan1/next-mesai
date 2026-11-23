# Mesai

Mobil öncelikli mesai, hedef maaş ve gelir-gider takip uygulaması (Next.js 16 + Supabase + shadcn/ui, liquid glass tema).

## Yapı (pnpm monorepo)
```
apps/web/        Next.js web uygulaması (çalışan + yönetici paneli)
apps/mobile/     Expo (React Native) uygulaması (çalışan ekranları), bkz. apps/mobile/README.md
packages/core/   Ortak hesap mantığı: mesai/maaş hesabı, raporlar, puantaj, tipler (+ testler)
supabase/        Veritabanı migration'ları
```
Web ve mobil, hesap mantığını `@mesai/core/<dosya>` olarak içe aktarır (ör. `@mesai/core/calc`).

## Kurulum
1. `supabase/migrations/` altındaki dosyaları sırayla uygula (`pnpm dlx supabase db push --remote`).
2. `apps/web/.env.local` içine `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ekle.
3. Kökte `pnpm install && pnpm dev`. Kontroller: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Gizlilik modeli
Yönetici yalnızca çalışanın onayladığı bağlantıdaki **mesai/izin kayıtlarını** ve adını görür (RLS ile zorunlu).
Ücret, hedef maaş ve gelir-gider tabloları sadece sahibine açıktır.
