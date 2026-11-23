// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  // Ekran açılınca Supabase'den veri çekmek (fetch-on-mount) bilinçli; web'deki ayarla aynı
  { rules: { 'react-hooks/set-state-in-effect': 'off' } },
]);
