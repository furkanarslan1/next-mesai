import { redirect } from "next/navigation";

// Eski adres: Ücret ve hedef artık Ayarlar altında
export default function GoalRedirect() {
  redirect("/profile/pay");
}
