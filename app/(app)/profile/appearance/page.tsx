"use client";

import { Page } from "@/components/mesai/page";
import { AppearanceSettings } from "@/components/mesai/appearance-card";

export default function P() {
  return <Page title="Görünüm" back={{ href: "/profile", label: "Ayarlar" }}><div className="mx-auto max-w-2xl"><AppearanceSettings /></div></Page>;
}
