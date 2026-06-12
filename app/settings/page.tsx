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
  IconLock,
  IconLockOpen,
  IconLoader2
} from "@tabler/icons-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
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
  const [healthCheckInterval, setHealthCheckInterval] = useState("30");
  const [timezonesList, setTimezonesList] = useState<string[]>(COMMON_TIMEZONES);

  // Export modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  // Import password modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFileContent, setImportFileContent] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  React.useEffect(() => {
    const loadSettings = async () => {
      const res = await getSettingsAction();
      if (res.success && res.timezone) {
        setTimezone(res.timezone);
        setHealthCheckInterval(res.healthCheckInterval || "0");
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await saveSettingsAction(timezone, healthCheckInterval);
      if (res.success) {
        setStatus({ type: "success", message: t("settingsPage.saveSuccess") });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setStatus({ type: "error", message: res.error || t("common.error") });
      }
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || t("common.error") });
    } finally {
      setLoading(false);
    }
  };

  const triggerDownload = (jsonString: string) => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vaultbase_settings_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportWithPassword = async () => {
    if (exportPassword !== exportPasswordConfirm) {
      setExportError(t("settingsPage.exportPasswordMismatch"));
      return;
    }
    setExportError("");
    setExporting(true);
    try {
      const res = exportPassword
        ? await exportSettingsAction(exportPassword)
        : await exportSettingsAction();
      if (res.success && res.jsonString) {
        triggerDownload(res.jsonString);
        setExportModalOpen(false);
        setExportPassword("");
        setExportPasswordConfirm("");
        setStatus({ type: "success", message: t("settingsPage.exportSuccess") });
      } else {
        setExportError(res.error || t("common.error"));
      }
    } catch (err: any) {
      setExportError(err.message || t("common.error"));
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus(null);

    try {
      const text = await file.text();

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        setStatus({ type: "error", message: t("settingsPage.invalidJson") });
        return;
      }

      if (parsed && parsed.passwordProtected) {
        setImportFileContent(text);
        setImportPassword("");
        setImportError("");
        setImportModalOpen(true);
      } else {
        setLoading(true);
        try {
          const res = await importSettingsAction(text);
          if (res.success) {
            setStatus({
              type: "success",
              message: t("settingsPage.importSuccess", { count: res.importedCount ?? 0 })
            });
            setTimeout(() => window.location.reload(), 1500);
          } else {
            setStatus({ type: "error", message: `${t("settingsPage.importFailed")}: ${res.error}` });
          }
        } catch (err: any) {
          setStatus({ type: "error", message: err.message || t("settingsPage.importFailed") });
        } finally {
          setLoading(false);
        }
      }
    } catch (err: any) {
      setStatus({ type: "error", message: t("settingsPage.fileReadError") });
    }

    e.target.value = "";
  };

  const handleImportWithPassword = async () => {
    if (!importPassword) {
      setImportError(t("settingsPage.importPasswordRequired"));
      return;
    }
    setImportError("");
    setImporting(true);
    try {
      const res = await importSettingsAction(importFileContent, importPassword);
      if (res.success) {
        setImportModalOpen(false);
        setStatus({
          type: "success",
            message: t("settingsPage.importSuccess", { count: res.importedCount ?? 0 })
        });
        setTimeout(() => window.location.reload(), 1500);
      } else if (res.error === "WRONG_PASSWORD") {
        setImportError(t("settingsPage.importPasswordWrong"));
      } else {
        setImportError(res.error || t("settingsPage.importFailed"));
      }
    } catch (err: any) {
      setImportError(err.message || t("settingsPage.importFailed"));
    } finally {
      setImporting(false);
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
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-mono tracking-wider text-[#a09e96] uppercase">
                  {t("settingsPage.timezoneSelectLabel")}
                </label>
                <Select value={timezone} onValueChange={setTimezone} disabled={loading}>
                  <SelectTrigger className="bg-[#141210] border-[#2b2926] text-xs text-white font-mono rounded h-10 w-full">
                    <SelectValue placeholder={t("settingsPage.timezoneSelectLabel")} />
                  </SelectTrigger>
                  <SelectContent position="popper" className="bg-[#141210] border-[#2b2926] text-[#E6E4DD] max-h-75 overflow-y-auto">
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
                        <SelectItem key={tz} value={tz} className="hover:bg-[#2b2926] text-xs font-mono">
                          {tz}{offsetStr}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Health check interval */}
              <div className="space-y-2 pt-4 border-t border-[#2b2926]">
                <label className="block text-[10px] font-mono tracking-wider text-[#55f289] uppercase">
                  {t("settingsPage.healthCheckTitle")}
                </label>
                <p className="text-[10px] font-mono text-[#605e58] leading-relaxed">
                  {t("settingsPage.healthCheckDesc")}
                </p>
                <div className="pt-1 space-y-2">
                  <label className="block text-[10px] font-mono tracking-wider text-[#a09e96] uppercase">
                    {t("settingsPage.healthCheckInterval")}
                  </label>
                  <Select value={healthCheckInterval} onValueChange={setHealthCheckInterval} disabled={loading}>
                    <SelectTrigger className="bg-[#141210] border-[#2b2926] text-xs text-white font-mono rounded h-10 w-full">
                      <SelectValue placeholder={t("settingsPage.healthCheckDisabled")} />
                    </SelectTrigger>
                    <SelectContent position="popper" className="bg-[#141210] border-[#2b2926] text-[#E6E4DD]">
                      <SelectItem value="0" className="hover:bg-[#2b2926] text-xs font-mono">{t("settingsPage.healthCheckDisabled")}</SelectItem>
                      <SelectItem value="15" className="hover:bg-[#2b2926] text-xs font-mono">{t("settingsPage.healthCheck15s")}</SelectItem>
                      <SelectItem value="30" className="hover:bg-[#2b2926] text-xs font-mono">{t("settingsPage.healthCheck30s")}</SelectItem>
                      <SelectItem value="60" className="hover:bg-[#2b2926] text-xs font-mono">{t("settingsPage.healthCheck60s")}</SelectItem>
                    </SelectContent>
                  </Select>
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
              <span className="text-white font-bold uppercase block">⚠️ {t("settingsPage.noteTitle")}:</span>
              <p>• {t("settingsPage.noteEncrypted")}</p>
              <p>• {t("settingsPage.notePlaintext")}</p>
              <p>• {t("settingsPage.noteStorage")}</p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button
                onClick={() => { setExportModalOpen(true); setExportPassword(""); setExportPasswordConfirm(""); setExportError(""); }}
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

      {/* Export Password Modal */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="max-w-[500px] bg-[#0d0c0b] text-[#E6E4DD] border border-[#2b2926] font-sans rounded-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono tracking-wider uppercase text-white flex items-center gap-2">
              <IconLock size={16} className="text-[#55f289]" />
              {t("settingsPage.exportPasswordTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#a09e96] pt-1 leading-relaxed">
              {t("settingsPage.exportPasswordDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4 font-mono text-xs">
            <div className="space-y-2">
              <label className="block text-[10px] text-[#a09e96] uppercase tracking-wider">
                {t("settingsPage.exportPasswordLabel")}
              </label>
              <Input
                type="password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                disabled={exporting}
                className="bg-[#141210] border-[#2b2926] focus:border-[#d2541c] text-xs text-white rounded h-9 w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] text-[#a09e96] uppercase tracking-wider">
                {t("settingsPage.exportPasswordConfirm")}
              </label>
              <Input
                type="password"
                value={exportPasswordConfirm}
                onChange={(e) => setExportPasswordConfirm(e.target.value)}
                disabled={exporting}
                className="bg-[#141210] border-[#2b2926] focus:border-[#d2541c] text-xs text-white rounded h-9 w-full"
              />
            </div>

            {exportError && (
              <div className="p-3 bg-[#2d1210] border border-[#4b1b1a] text-[#f25c55] rounded">
                {exportError}
              </div>
            )}

            {!exportPassword && !exportError && (
              <div className="p-3 bg-[#2d1b10] border border-[#4b2f1a] text-[#f29f55] rounded flex items-start gap-2">
                <IconAlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{t("settingsPage.exportWarning")}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={exporting}
              onClick={() => { setExportModalOpen(false); setExportError(""); }}
              className="border-[#2b2926] text-[#E6E4DD] hover:bg-[#1c1a17] hover:text-white font-mono text-xs cursor-pointer rounded"
            >
              {t("common.cancel")}
            </Button>
            {exportPassword ? (
              <Button
                type="button"
                disabled={exporting}
                onClick={handleExportWithPassword}
                className="bg-[#1b3224] hover:bg-[#223f2d] text-white border border-[#2b4c37] font-mono text-xs cursor-pointer rounded"
              >
                {exporting ? (
                  <span className="flex items-center gap-1">
                    <IconLoader2 size={12} className="animate-spin" />
                    {t("settingsPage.exportInProgress")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <IconLock size={12} />
                    {t("settingsPage.exportWithPassword")}
                  </span>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={exporting}
                onClick={handleExportWithPassword}
                className="bg-[#2d1210] hover:bg-[#3f1614] text-[#f25c55] border border-[#4b1b1a] font-mono text-xs cursor-pointer rounded"
              >
                {exporting ? (
                  <span className="flex items-center gap-1">
                    <IconLoader2 size={12} className="animate-spin" />
                    {t("settingsPage.exportInProgress")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <IconLockOpen size={12} />
                    {t("settingsPage.exportWithoutPassword")}
                  </span>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Password Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-[500px] bg-[#0d0c0b] text-[#E6E4DD] border border-[#2b2926] font-sans rounded-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono tracking-wider uppercase text-white flex items-center gap-2">
              <IconLock size={16} className="text-[#f29f55]" />
              {t("settingsPage.importPasswordTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#a09e96] pt-1 leading-relaxed">
              {t("settingsPage.importPasswordDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4 font-mono text-xs">
            <div className="space-y-2">
              <label className="block text-[10px] text-[#a09e96] uppercase tracking-wider">
                {t("settingsPage.importPasswordLabel")}
              </label>
              <Input
                type="password"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                disabled={importing}
                placeholder="••••••••"
                className="bg-[#141210] border-[#2b2926] focus:border-[#d2541c] text-xs text-white rounded h-9 w-full"
              />
            </div>

            {importError && (
              <div className="p-3 bg-[#2d1210] border border-[#4b1b1a] text-[#f25c55] rounded">
                {importError}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={importing}
              onClick={() => { setImportModalOpen(false); setImportError(""); }}
              className="border-[#2b2926] text-[#E6E4DD] hover:bg-[#1c1a17] hover:text-white font-mono text-xs cursor-pointer rounded"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={importing || !importPassword}
              onClick={handleImportWithPassword}
              className="bg-[#1b3224] hover:bg-[#223f2d] text-white border border-[#2b4c37] font-mono text-xs cursor-pointer rounded"
            >
              {importing ? (
                <span className="flex items-center gap-1">
                  <IconLoader2 size={12} className="animate-spin" />
                  {t("settingsPage.importInProgress")}
                </span>
              ) : (
                t("common.import")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
