import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/mesai/bottom-nav";
import { Toaster } from "@/components/ui/sonner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 pb-28 pt-6">
      {children}
      <BottomNav role={profile?.role ?? "employee"} />
      <Toaster />
    </div>
  );
}
