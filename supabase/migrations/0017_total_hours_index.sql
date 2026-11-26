-- total_overtime_hours() uygulama açılışında çağrılır ve kullanıcının TÜM ZAMANLAR mesai satırlarını toplar.
-- Satırlar tabloda dağınık (herkes aynı saatlerde yazar) → her açılışta yüzlerce rastgele blok okuması.
-- Yük testinde DB süresinin ~%83'ü bu fonksiyondaydı (ort. 16,6 ms; insert 1,3 ms).
-- Kısmi + covering index: toplam yalnızca index'ten okunur (index-only scan), tabloya gidilmez.
create index if not exists entries_user_overtime_hours
  on public.entries (user_id) include (hours)
  where type in ('overtime', 'holiday');
