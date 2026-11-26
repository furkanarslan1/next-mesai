// 25 sahte kullanıcı açar (normal kayıt yolu), her birine bu ay için ~20 kayıt ekler, token'ları users.json'a yazar.
import { writeFileSync } from "node:fs";
import { URL, KEY } from "./env.mjs";
const N = 25, run = Date.now().toString(36);
const users = [];
for (let i = 0; i < N; i++) {
  const email = `loadtest-${run}-${i}@example.com`;
  const r = await fetch(`${URL}/auth/v1/signup`, { method: "POST", headers: { apikey: KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password: "Lt-" + run + "-pass!", data: { full_name: `Loadtest ${i}`, role: "employee" } }) });
  const j = await r.json();
  if (!j.access_token) { console.error("kayıt hatası", r.status, JSON.stringify(j).slice(0, 200)); break; }
  const rows = Array.from({ length: 20 }, (_, d) => ({ user_id: j.user.id, work_date: `2026-11-${String(d + 1).padStart(2, "0")}`, type: "overtime", hours: 2.5 }));
  const ins = await fetch(`${URL}/rest/v1/entries`, { method: "POST", headers: { apikey: KEY, authorization: `Bearer ${j.access_token}`, "content-type": "application/json" }, body: JSON.stringify(rows) });
  if (!ins.ok) console.error("seed hatası", ins.status, await ins.text());
  users.push({ id: j.user.id, token: j.access_token });
}
writeFileSync(new globalThis.URL("./users.json", import.meta.url), JSON.stringify(users));
console.log(`${users.length} kullanıcı hazır`);
