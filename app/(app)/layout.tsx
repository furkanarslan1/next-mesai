import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/mesai/bottom-nav";
import { Toaster } from "@/components/ui/sonner";

async function Nav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return <BottomNav role={profile?.role ?? "employee"} />;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 pb-28 pt-6">
      <Suspense fallback={<div className="glass h-40 animate-pulse" />}>{children}</Suspense>
      <Suspense fallback={null}><Nav /></Suspense>
      <Toaster />
    </div>
  );
}
