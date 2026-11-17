# Mesai

Mobil öncelikli mesai, hedef maaş ve gelir-gider takip uygulaması (Next.js 16 + Supabase + shadcn/ui, liquid glass tema).

## Kurulum
1. Supabase SQL Editor'de `supabase/migrations/` altındaki dosyaları sırayla çalıştır (`0001_init`, `0002_shift_times`, `0003_work_profile`).
2. `.env.local` içine `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ekle.
3. `pnpm install && pnpm dev`

## Gizlilik modeli
Yönetici yalnızca çalışanın onayladığı bağlantıdaki **mesai/izin kayıtlarını** ve adını görür (RLS ile zorunlu).
Ücret, hedef maaş ve gelir-gider tabloları sadece sahibine açıktır.
