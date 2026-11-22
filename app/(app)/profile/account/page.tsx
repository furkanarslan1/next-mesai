"use client";

import { Page } from "@/components/mesai/page";
import { AccountSettings } from "@/components/mesai/settings-sections";

export default function P() {
  return <Page title="Hesap" back={{ href: "/profile", label: "Ayarlar" }}><div className="max-w-2xl"><AccountSettings /></div></Page>;
}
