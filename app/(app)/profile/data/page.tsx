"use client";

import { Page } from "@/components/mesai/page";
import { DataSettings } from "@/components/mesai/settings-sections";

export default function P() {
  return <Page title="Yedekleme" back={{ href: "/profile", label: "Ayarlar" }}><div className="max-w-2xl"><DataSettings /></div></Page>;
}
