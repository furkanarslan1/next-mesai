// 16:00 senaryosu: uygulama açılışı (5 istek) + mesai kaydı (1 insert). Bir "iterasyon" = 1 kullanıcının 1 kaydı.
import http from "k6/http";
import { check } from "k6";
const URL = __ENV.URL, KEY = __ENV.KEY;
const users = JSON.parse(open("./users.json"));
const PEAK = Number(__ENV.PEAK || 80); // iterasyon/sn (x6 istek)
export const options = {
  scenarios: { rush: { executor: "ramping-arrival-rate", startRate: 2, timeUnit: "1s", preAllocatedVUs: 100, maxVUs: 600,
    stages: [ { target: Math.round(PEAK / 4), duration: "30s" }, { target: Math.round(PEAK / 2), duration: "45s" }, { target: PEAK, duration: "30s" }, { target: PEAK, duration: "60s" }, { target: 0, duration: "15s" } ] } },
  thresholds: { http_req_failed: ["rate<0.01"], "http_req_duration{name:insert}": ["p(95)<800"] },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};
export default function () {
  const u = users[Math.floor(Math.random() * users.length)];
  const h = { headers: { apikey: KEY, authorization: `Bearer ${u.token}` } };
  const r = `${URL}/rest/v1`;
  const open = http.batch([
    ["GET", `${r}/profiles?select=id,full_name,role,invite_code&id=eq.${u.id}`, null, { ...h, tags: { name: "profile" } }],
    ["GET", `${r}/user_settings?select=*`, null, { ...h, tags: { name: "settings" } }],
    ["GET", `${r}/shortcuts?select=id,label,hours,sort,start_time,end_time&order=sort`, null, { ...h, tags: { name: "shortcuts" } }],
    ["POST", `${r}/rpc/total_overtime_hours`, "{}", { headers: { ...h.headers, "content-type": "application/json" }, tags: { name: "total" } }],
    ["GET", `${r}/entries?select=id,work_date,type,hours,note,start_time,end_time,shortcut_id&work_date=gte.2026-11-01&work_date=lte.2026-11-30`, null, { ...h, tags: { name: "month" } }],
  ]);
  open.forEach((x) => check(x, { "open 200": (y) => y.status === 200 }));
  // Test kayıtları 2019'a gider: bu ayın sorgusu büyümesin (gerçekçi boyut), silinince hepsi temizlenir.
  const day = `2019-${String(1 + Math.floor(Math.random() * 12)).padStart(2, "0")}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, "0")}`;
  const ins = http.post(`${r}/entries?select=id,work_date,type,hours`, JSON.stringify({ user_id: u.id, work_date: day, type: "overtime", hours: 2.5 }),
    { headers: { ...h.headers, "content-type": "application/json", Prefer: "return=representation" }, tags: { name: "insert" } });
  check(ins, { "insert 201": (y) => y.status === 201 });
}
