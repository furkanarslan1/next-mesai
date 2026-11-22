"use client";

import { Page } from "@/components/mesai/page";
import { ShortcutSettings } from "@/components/mesai/settings-sections";

export default function P() {
  return <Page title="Kısayollar" back={{ href: "/profile", label: "Ayarlar" }}><div className="mx-auto max-w-2xl"><ShortcutSettings /></div></Page>;
}
