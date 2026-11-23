# Mesai — mobil (Expo)

Web ile aynı Supabase projesini ve aynı hesap mantığını (`@mesai/core`) kullanır. Yönetici paneli yalnızca web'dedir.

## Çalıştırma
1. `apps/mobile/.env.local`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   ```
2. Kökte `pnpm install`, sonra `pnpm mobile` (veya `apps/mobile` içinde `pnpm start`).
3. Telefonda **Expo Go** ile terminaldeki QR kodu okut (telefon ve bilgisayar aynı Wi-Fi'da olmalı; değilse `pnpm start --tunnel`).

Paket eklerken `npx expo install <paket>` kullan (SDK'ya uygun sürümü seçer).
