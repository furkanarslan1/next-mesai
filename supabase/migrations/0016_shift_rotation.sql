-- Vardiya döngüsü: haftalık (ya da birkaç haftada bir) değişen vardiya. Boşsa sabit çalışma saati kullanılır.
-- Biçim: {"start": "2026-11-23", "weeks": 1, "steps": [{"type": "day", "start": "08:00", "end": "16:00"}, ...]}
-- "start" döngünün ilk adımının başladığı haftanın pazartesisidir.
alter table public.user_settings
  add column shift_rotation jsonb;
