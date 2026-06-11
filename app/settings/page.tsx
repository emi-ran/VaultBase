"use client";

import React, { useState, useRef } from "react";
import { useTranslation } from "../../components/i18n-provider";
import { 
  IconSettings, 
  IconDownload, 
  IconUpload, 
  IconAlertCircle,
  IconCheck,
  IconShieldLock,
  IconVolume
} from "@tabler/icons-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { exportSettingsAction, importSettingsAction, getSettingsAction, saveSettingsAction } from "../actions";

const COMMON_TIMEZONES = [
  "UTC",
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export default function SettingsPage() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [timezone, setTimezone] = useState("Europe/Istanbul");
  const [timezonesList, setTimezonesList] = useState<string[]>(COMMON_TIMEZONES);

  React.useEffect(() => {
    const loadSettings = async () => {
      const res = await getSettingsAction();
      if (res.success && res.timezone) {
        setTimezone(res.timezone);
      }
    };
    loadSettings();

    try {
      if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
        const list = Intl.supportedValuesOf("timeZone");
        const merged = Array.from(new Set([...COMMON_TIMEZONES, ...list])).sort();
        setTimezonesList(merged);
      }
    } catch (e) {
      console.warn("Intl.supportedValuesOf not supported, using fallback timezone list", e);
    }
  }, []);

  const handleSaveTimezone = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await saveSettingsAction(timezone);
      if (res.success) {
        setStatus({ type: "success", message: t("settingsPage.saveSuccess") });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setStatus({ type: "error", message: res.error || "Failed to save settings." });
      }
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Failed to save timezone." });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await exportSettingsAction();
      if (res.success && res.jsonString) {
        // Create a blob and trigger download
        const blob = new Blob([res.jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vaultbase_settings_${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus({ type: "success", message: "Ayarlar başarıyla dışa aktarıldı." });
      } else {
        setStatus({ type: "error", message: `Dışa aktarma başarısız: ${res.error}` });
      }
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Failed to export settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        try {
          const res = await importSettingsAction(text);
          if (res.success) {
            setStatus({ 
              type: "success", 
              message: `${res.importedCount} yeni veritabanı bağlantısı başarıyla içe aktarıldı. Sayfa yenileniyor...` 
            });
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            setStatus({ type: "error", message: `${t("settingsPage.importFailed")}: ${res.error}` });
          }
        } catch (err: any) {
          setStatus({ type: "error", message: err.message || t("settingsPage.importFailed") });
        } finally {
          setLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      setStatus({ type: "error", message: "Dosya okunamadı." });
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#090807] text-[#E6E4DD] font-sans">
      
      {/* Header */}
      <header className="h-16 border-b border-[#2b2926] px-8 flex items-center shrink-0 bg-[#0d0c0b]">
        <div className="flex items-center gap-3">
          <IconSettings size={18} className="text-[#55f289]" />
          <h1 className="text-sm font-mono tracking-wider font-bold text-white uppercase">{t("settingsPage.title")}</h1>
        </div>
      </header>

      {/* Settings Options Grid */}
      <div className="p-8 max-w-3xl w-full mx-auto space-y-6">
        
        {/* Timezone Configuration Card */}
        <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md font-sans">
          <CardHeader className="p-6 border-b border-[#2b2926]">
            <CardTitle className="text-sm font-mono tracking-wider text-white uppercase flex items-center gap-2">
              <IconSettings size={16} className="text-[#55f289]" />
              {t("settingsPage.timezoneTitle")}
            </CardTitle>
            <CardDescription className="text-xs text-[#a09e96] pt-1 leading-relaxed">
              {t("settingsPage.timezoneDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSaveTimezone} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-mono tracking-wider text-[#a09e96] uppercase">
                  {t("settingsPage.timezoneSelectLabel")}
                </label>
                <div className="relative">
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    disabled={loading}
                    className="bg-[#0d0c0b] border border-[#2b2926] rounded px-3 py-2.5 text-xs font-mono text-[#E6E4DD] w-full focus:outline-none focus:ring-1 focus:ring-[#55f289] focus:border-[#55f289] disabled:opacity-50 appearance-none cursor-pointer"
                  >
                    {timezonesList.map((tz) => {
                      let offsetStr = "";
                      try {
                        const parts = new Intl.DateTimeFormat("en-US", {
                          timeZone: tz,
                          timeZoneName: "shortOffset",
                        }).formatToParts(new Date());
                        const offsetPart = parts.find((p) => p.type === "timeZoneName");
                        offsetStr = offsetPart ? ` (${offsetPart.value})` : "";
                      } catch (e) {}

                      return (
                        <option key={tz} value={tz} className="bg-[#0d0c0b] text-[#E6E4DD]">
                          {tz}{offsetStr}
                        </option>
                      );
                    })}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#a09e96]">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[#1b3224] hover:bg-[#223f2d] text-white border border-[#2b4c37] font-mono text-xs cursor-pointer py-2.5 px-6 h-auto rounded flex items-center gap-2"
                >
                  {t("settingsPage.saveBtn")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Export / Import Settings Card */}
        <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md font-sans">
          <CardHeader className="p-6 border-b border-[#2b2926]">
            <CardTitle className="text-sm font-mono tracking-wider text-white uppercase flex items-center gap-2">
              <IconShieldLock size={16} className="text-[#55f289]" />
              {t("settingsPage.backupTitle")}
            </CardTitle>
            <CardDescription className="text-xs text-[#a09e96] pt-1 leading-relaxed">
              {t("settingsPage.backupDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            {/* Status alerts */}
            {status && (
              <div
                className={`p-4 rounded text-xs font-mono border flex items-center gap-3 ${
                  status.type === "success"
                    ? "bg-[#132219] border-[#1b3f2a] text-[#55f289]"
                    : "bg-[#2d1210] border-[#4b1b1a] text-[#f25c55]"
                }`}
              >
                {status.type === "success" ? <IconCheck size={16} /> : <IconAlertCircle size={16} />}
                <span>{status.message}</span>
              </div>
            )}

            {/* Instruction Warning Alert */}
            <div className="p-4 bg-[#141210] border border-[#2b2926] rounded text-xs font-mono text-[#a09e96] space-y-2 leading-relaxed">
              <span className="text-white font-bold uppercase block">⚠️ UYARI / NOT:</span>
              <p>
                Veritabanı şifreleri veritabanında şifreli olarak saklanır. Yedeklerinizi başka bir sunucuya taşırken şifrelerin başarıyla çözülebilmesi için, her iki sunucudaki <code className="text-white px-1 py-0.5 bg-[#2c2925] rounded">APP_SECRET</code> çevre değişkeninin (env) <strong>tamamen aynı</strong> olması gerekir. Aksi takdirde veritabanı bağlantısı şifresi çözülemez ve yeniden girmeniz gerekir.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button
                onClick={handleExport}
                disabled={loading}
                className="bg-[#1b3224] hover:bg-[#223f2d] text-white border border-[#2b4c37] font-mono text-xs cursor-pointer py-2.5 h-auto rounded flex-1 flex items-center justify-center gap-2"
              >
                <IconDownload size={14} />
                {t("settingsPage.exportBtn")}
              </Button>

              <div className="flex-1">
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  onClick={handleImportClick}
                  disabled={loading}
                  variant="outline"
                  className="border-[#2b2926] text-[#E6E4DD] hover:bg-[#1c1a17] hover:text-white font-mono text-xs cursor-pointer py-2.5 h-auto rounded w-full flex items-center justify-center gap-2"
                >
                  <IconUpload size={14} />
                  {t("settingsPage.importBtn")}
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
