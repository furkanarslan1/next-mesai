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
    <div className="mx-auto flex min-h-dvh max-w-6xl gap-6 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] md:pb-6">
      <Suspense fallback={<div className="hidden w-56 shrink-0 md:block" />}><Nav /></Suspense>
      <main className="min-w-0 flex-1">
        <Suspense fallback={<div className="glass h-40 animate-pulse" />}>{children}</Suspense>
      </main>
      <Toaster />
    </div>
  );
}
