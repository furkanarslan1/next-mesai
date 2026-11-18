import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/mesai/bottom-nav";
import { Toaster } from "@/components/ui/sonner";

async function Nav() {
  // Supabase oturum kontrolü Date.now() kullanır; bu yüzden istek anında çalışmalı
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return <BottomNav role={profile?.role ?? "employee"} />;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <Suspense fallback={<div className="glass h-40 animate-pulse" />}>{children}</Suspense>
      <Suspense fallback={null}><Nav /></Suspense>
      <Toaster />
    </div>
  );
}
