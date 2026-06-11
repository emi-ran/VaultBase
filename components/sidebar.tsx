"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "./i18n-provider";
import { Locale } from "../lib/i18n";
import { 
  IconLayoutDashboard, 
  IconDatabase, 
  IconFileZip, 
  IconClock, 
  IconArchive, 
  IconServer, 
  IconSettings,
  IconShield,
  IconCircleFilled,
  IconLanguage
} from "@tabler/icons-react";

export function Sidebar() {
  const pathname = usePathname();
  const { locale, setLocale, t } = useTranslation();

  const menuItems = [
    {
      name: t("navigation.overview"),
      href: "/",
      icon: IconLayoutDashboard,
    },
    {
      name: t("navigation.databases"),
      href: "/databases",
      icon: IconDatabase,
    },
    {
      name: t("navigation.backupJobs"),
      href: "/jobs",
      icon: IconFileZip,
    },
    {
      name: t("navigation.schedules"),
      href: "/schedules",
      icon: IconClock,
    },
    {
      name: t("navigation.backupArchive"),
      href: "/archive",
      icon: IconArchive,
    },
    {
      name: t("navigation.storage"),
      href: "/storage",
      icon: IconServer,
    },
    {
      name: t("navigation.settings"),
      href: "/settings",
      icon: IconSettings,
    },
  ];

  return (
    <aside className="w-64 bg-[#0d0c0b] border-r border-[#2b2926] flex flex-col justify-between h-screen text-[#a09e96] font-sans shrink-0">
      <div>
        {/* Branding header */}
        <div className="p-6 border-b border-[#2b2926] flex items-center gap-3">
          <div className="h-9 w-9 bg-[#1b3224] border border-[#2b4c37] rounded flex items-center justify-center text-[#55f289]">
            <IconShield size={20} />
          </div>
          <div>
            <h1 className="font-mono text-xs tracking-wider text-white font-bold uppercase">VAULTBASE</h1>
            <span className="font-mono text-[9px] text-[#605e58] tracking-widest block mt-0.5">v0.1.0-alpha</span>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded text-xs font-mono tracking-wider transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#1b3224]/30 text-white border-l-2 border-[#55f289] font-bold"
                    : "hover:bg-[#141210] hover:text-[#E6E4DD]"
                }`}
              >
                <Icon size={16} className={isActive ? "text-[#55f289]" : "text-[#605e58]"} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#2b2926] space-y-4">
        {/* Language switch */}
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="flex items-center gap-1.5 text-[#605e58]">
            <IconLanguage size={12} />
            LANGUAGE
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setLocale("tr")}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${
                locale === "tr" ? "bg-[#1b3224] text-white border border-[#2b4c37]" : "hover:text-[#E6E4DD]"
              }`}
            >
              TR
            </button>
            <button
              onClick={() => setLocale("en")}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${
                locale === "en" ? "bg-[#1b3224] text-white border border-[#2b4c37]" : "hover:text-[#E6E4DD]"
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* System status */}
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-[#605e58]">{t("common.systemHealth").toUpperCase()}</span>
          <span className="flex items-center gap-1.5 text-white">
            <IconCircleFilled size={8} className="text-[#55f289]" />
            {t("common.good").toUpperCase()}
          </span>
        </div>
      </div>
    </aside>
  );
}
