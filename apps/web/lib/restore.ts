import { restoreBackup as restore } from "@mesai/core/backup";
import { createClient } from "@/lib/supabase/client";

/** JSON yedeğini giriş yapmış kullanıcının hesabına birleştirir (mantık `@mesai/core/backup`'ta). */
export const restoreBackup = (text: string) => restore(createClient(), text);
