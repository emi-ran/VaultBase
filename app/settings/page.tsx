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
import { exportSettingsAction, importSettingsAction } from "../actions";

export default function SettingsPage() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
