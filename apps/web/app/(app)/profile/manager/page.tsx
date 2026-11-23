"use client";

import { Page } from "@/components/mesai/page";
import { ManagerSettings } from "@/components/mesai/settings-sections";

export default function P() {
  return <Page title="Yöneticim" back={{ href: "/profile", label: "Ayarlar" }}><div className="max-w-2xl"><ManagerSettings /></div></Page>;
}
