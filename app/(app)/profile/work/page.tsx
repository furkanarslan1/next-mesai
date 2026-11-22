"use client";

import { Page } from "@/components/mesai/page";
import { WorkSettings } from "@/components/mesai/settings-sections";

export default function P() {
  return <Page title="Çalışma saati" back={{ href: "/profile", label: "Ayarlar" }}><div className="max-w-2xl"><WorkSettings /></div></Page>;
}
