// Yük testi hedefi: apps/web/.env.local'deki proje. Canlıya yanlışlıkla gitmesin diye
// LOADTEST_REF=<proje ref> açıkça verilmeli ve URL ile eşleşmeli.
import { readFileSync } from "node:fs";
const txt = readFileSync(new URL("../../apps/web/.env.local", import.meta.url), "utf8");
const get = (k) => txt.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "");
export const URL_ = get("NEXT_PUBLIC_SUPABASE_URL");
export const KEY = get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const ref = process.env.LOADTEST_REF;
if (!ref || !URL_?.includes(`${ref}.supabase.co`)) throw new Error(`LOADTEST_REF (${ref}) .env.local'deki projeyle eşleşmiyor: ${URL_}`);
export { URL_ as URL };
