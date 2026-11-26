// Her sahte kullanıcı kendi hesabını siler (cascade: tüm kayıtları da gider).
import { readFileSync } from "node:fs";
import { URL, KEY } from "./env.mjs";
const users = JSON.parse(readFileSync(new globalThis.URL("./users.json", import.meta.url), "utf8"));
let ok = 0;
for (const u of users) {
  const r = await fetch(`${URL}/rest/v1/rpc/delete_my_account`, { method: "POST", headers: { apikey: KEY, authorization: `Bearer ${u.token}`, "content-type": "application/json" }, body: "{}" });
  r.ok ? ok++ : console.error(u.id, r.status, await r.text());
}
console.log(`${ok}/${users.length} silindi`);
