import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HomeClient } from "@/components/mesai/home-client";

async function HomeData() {
  // Supabase oturum kontrolü Date.now() kullanır; istek anında çalışmalı
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user!.id).single();
  if (profile?.role === "manager") redirect("/manager");
  return <HomeClient name={profile?.full_name ?? ""} userId={user!.id} />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="glass h-56 w-full animate-pulse" aria-busy />}>
      <HomeData />
    </Suspense>
  );
}
