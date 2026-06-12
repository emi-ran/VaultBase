"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  IconDatabase, 
  IconDatabaseExport, 
  IconTrash, 
  IconExternalLink,
  IconAlertCircle,
  IconLoader2,
  IconSearch,
  IconRefresh,
  IconCircleFilled,
  IconClock,
  IconFileZip,
  IconTag
} from "@tabler/icons-react";
import { useTranslation } from "./i18n-provider";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { DatabaseModal } from "./database-modal";
import { DatabaseTypeMark } from "./database-type-mark";
import { 
  triggerBackupAction, 
  deleteDatabaseAction, 
  getDatabaseSizeAction,
  testAndUpdateDatabaseStatusAction,
  testAllConnectionsAction,
  getSettingsAction
} from "../app/actions";

// Format bytes helper
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

interface DatabasesPageClientProps {
  databases: any[];
}

export function DatabasesPageClient({ databases }: DatabasesPageClientProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEnv, setSelectedEnv] = useState<string>("all");
  const [selectedLabel, setSelectedLabel] = useState<string>("all");

  // Connection Testing states
  const [testingDbs, setTestingDbs] = useState<Record<string, boolean>>({});
  const [testingAll, setTestingAll] = useState(false);
  const [healthCheckInterval, setHealthCheckInterval] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Backup dialog states
  const [backupOpen, setBackupOpen] = useState(false);
  const [selectedDb, setSelectedDb] = useState<any>(null);
  const [dbSize, setDbSize] = useState<string | null>(null);
  const [loadingSize, setLoadingSize] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<{ success: boolean; message: string } | null>(null);
  const [customFilename, setCustomFilename] = useState("");

  // Delete DB dialog states
  const [deleteDbOpen, setDeleteDbOpen] = useState(false);
  const [dbToDelete, setDbToDelete] = useState<any>(null);
  const [deletingDb, setDeletingDb] = useState(false);

  // Compile all unique labels from databases
  const allLabels = useMemo(() => {
    const labelsSet = new Set<string>();
    databases.forEach((db) => {
      if (db.labels) {
        db.labels.split(",").forEach((lbl: string) => {
          const trimmed = lbl.trim();
          if (trimmed) labelsSet.add(trimmed);
        });
      }
    });
    return Array.from(labelsSet);
  }, [databases]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = databases.length;
    const healthy = databases.filter((db) => db.status === "healthy").length;
    const offline = databases.filter((db) => db.status === "offline").length;
    const untested = databases.filter((db) => db.status === "untested" || !db.status).length;
    return { total, healthy, offline, untested };
  }, [databases]);

  // Filtered Databases list
  const filteredDatabases = useMemo(() => {
    return databases.filter((db) => {
      // 1. Search Query filter (matches host, name, database)
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        db.name.toLowerCase().includes(q) || 
        db.database.toLowerCase().includes(q) || 
        db.host.toLowerCase().includes(q);

      // 2. Environment filter
      const matchesEnv = selectedEnv === "all" || db.environment === selectedEnv;

      // 3. Label filter
      const matchesLabel = selectedLabel === "all" || (
        db.labels && db.labels.split(",").map((l: string) => l.trim()).includes(selectedLabel)
      );

      return matchesSearch && matchesEnv && matchesLabel;
    });
  }, [databases, searchQuery, selectedEnv, selectedLabel]);

  // Handle single database connection test
  const handleTestConnection = async (id: string) => {
    setTestingDbs((prev) => ({ ...prev, [id]: true }));
    try {
      await testAndUpdateDatabaseStatusAction(id);
      router.refresh();
    } catch (err) {
      console.error("Connection test failed:", err);
    } finally {
      setTestingDbs((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Handle test all connections
  const handleTestAllConnections = async () => {
    setTestingAll(true);
    try {
      await testAllConnectionsAction();
      router.refresh();
    } catch (err) {
      console.error("Test all connections failed:", err);
    } finally {
      setTestingAll(false);
    }
  };

  // Load health check interval on mount
  useEffect(() => {
    const loadInterval = async () => {
      try {
        const res = await getSettingsAction();
        if (res.success) {
          setHealthCheckInterval(parseInt(res.healthCheckInterval || "0", 10));
        }
      } catch {}
    };
    loadInterval();
  }, []);

  // Auto-polling effect
  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (healthCheckInterval > 0) {
      pollingRef.current = setInterval(async () => {
        try {
          await testAllConnectionsAction();
          router.refresh();
        } catch {}
      }, healthCheckInterval * 1000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [healthCheckInterval, router]);

  // Open Backup Modal
  const openBackupDialog = async (db: any) => {
    setSelectedDb(db);
    setDbSize(null);
    setCustomFilename("");
    setLoadingSize(true);
    setSizeError(false);
    setBackupResult(null);
    setBackupOpen(true);

    try {
      const res = await getDatabaseSizeAction(db.id);
      if (res.success && res.size !== undefined) {
        setDbSize(formatBytes(res.size));
      } else {
        setSizeError(true);
      }
    } catch {
      setSizeError(true);
    } finally {
      setLoadingSize(false);
    }
  };

  const handleStartBackup = async () => {
    if (!selectedDb) return;
    setBackingUp(true);
    setBackupResult(null);
    try {
      const res = await triggerBackupAction(selectedDb.id, customFilename);
      if (res.success) {
        const filename = "filename" in res ? res.filename : "";
        setBackupResult({ success: true, message: t("backup.successMsg") + (filename || "") });
        setTimeout(() => {
          setBackupOpen(false);
          setSelectedDb(null);
          router.refresh();
        }, 1500);
      } else {
        setBackupResult({ success: false, message: t("backup.failedMsg") + (res.error || "") });
      }
    } catch (err: any) {
      setBackupResult({ success: false, message: err.message || "Backup failed" });
    } finally {
      setBackingUp(false);
    }
  };

  // Open Delete database modal
  const openDeleteDbDialog = (db: any) => {
    setDbToDelete(db);
    setDeleteDbOpen(true);
  };

  const handleDeleteDb = async () => {
    if (!dbToDelete) return;
    setDeletingDb(true);
    try {
      await deleteDatabaseAction(dbToDelete.id);
      setDeleteDbOpen(false);
      setDbToDelete(null);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingDb(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto font-sans bg-[#090807] text-[#E6E4DD]">
      {/* Page Header */}
      <header className="h-16 border-b border-[#2b2926] px-8 flex items-center justify-between shrink-0 bg-[#0d0c0b]">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-mono tracking-wider font-bold text-white uppercase">{t("navigation.databases")}</h2>
          <span className="text-[10px] font-mono text-[#605e58] border border-[#2b2926] px-2 py-0.5 rounded">
            {stats.total} {stats.total === 1 ? "CONNECTION" : "CONNECTIONS"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {healthCheckInterval > 0 && (
            <span className="text-[9px] font-mono text-[#55f289] border border-[#1b3f2a] bg-[#132219] px-2 py-1 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#55f289] animate-pulse" />
              {t("database.autoCheckActive")}
            </span>
          )}
          <Button
            size="xs"
            variant="outline"
            disabled={testingAll}
            onClick={handleTestAllConnections}
            className="h-8 border-[#2b2926] text-[10px] text-[#E6E4DD] hover:bg-[#1c1a17] hover:text-white font-mono flex items-center gap-1.5 cursor-pointer rounded"
          >
            {testingAll ? (
              <IconLoader2 size={12} className="animate-spin" />
            ) : (
              <IconRefresh size={12} />
            )}
            {testingAll ? t("database.testingAll") : t("database.testAll")}
          </Button>
          <DatabaseModal onSuccess={() => router.refresh()} />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Connection Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat 1: Total Connections */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md shadow-lg">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("database.statsTotal") || "TOTAL DATABASES"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-mono font-bold text-white">{stats.total}</span>
                <IconDatabase size={20} className="text-[#a09e96] opacity-30" />
              </div>
            </CardContent>
          </Card>

          {/* Stat 2: Healthy Connections */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md shadow-lg">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("database.statsHealthy") || "HEALTHY CONNECTIONS"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-mono font-bold text-[#55f289]">{stats.healthy}</span>
                <IconCircleFilled size={12} className="text-[#55f289] animate-pulse" />
              </div>
            </CardContent>
          </Card>

          {/* Stat 3: Offline Connections */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md shadow-lg">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("database.statsOffline") || "OFFLINE CONNECTIONS"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-mono font-bold text-[#f25c55]">{stats.offline}</span>
                <IconCircleFilled size={12} className="text-[#f25c55]" />
              </div>
            </CardContent>
          </Card>

          {/* Stat 4: Untested Connections */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md shadow-lg">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("database.statsUntested") || "UNTESTED CONNECTIONS"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-mono font-bold text-[#a09e96]">{stats.untested}</span>
                <IconCircleFilled size={12} className="text-[#605e58]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters Controls */}
        <div className="bg-[#0d0c0b] border border-[#2b2926] p-4 rounded-md flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between shadow-xl">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <IconSearch size={14} className="absolute left-3 top-3 text-[#605e58]" />
            <Input
              placeholder={t("database.searchPlaceholder") || "İsim, veritabanı veya host ile ara..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#141210] border-[#2b2926] text-xs font-mono text-white focus:border-[#d2541c] focus:ring-1 focus:ring-[#d2541c] rounded h-9 w-full"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Env dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-[#605e58] tracking-wider uppercase whitespace-nowrap">{t("database.filterEnv") || "ORTAM"}:</span>
              <Select value={selectedEnv} onValueChange={setSelectedEnv}>
                <SelectTrigger className="bg-[#141210] border-[#2b2926] text-xs text-white font-mono rounded h-8 min-w-27.5 w-auto">
                  <SelectValue placeholder={locale === "tr" ? "Tümü" : "All"} />
                </SelectTrigger>
                <SelectContent position="popper" className="bg-[#141210] border-[#2b2926] text-[#E6E4DD]">
                  <SelectItem value="all" className="hover:bg-[#2b2926] text-xs font-mono">{locale === "tr" ? "Tümü" : "All"}</SelectItem>
                  <SelectItem value="production" className="hover:bg-[#2b2926] text-xs font-mono">{t("database.envProduction") || "Production"}</SelectItem>
                  <SelectItem value="staging" className="hover:bg-[#2b2926] text-xs font-mono">{t("database.envStaging") || "Staging"}</SelectItem>
                  <SelectItem value="development" className="hover:bg-[#2b2926] text-xs font-mono">{t("database.envDevelopment") || "Development"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Label dropdown */}
            {allLabels.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#605e58] tracking-wider uppercase whitespace-nowrap">{t("database.filterLabel") || "ETİKET"}:</span>
                <Select value={selectedLabel} onValueChange={setSelectedLabel}>
                  <SelectTrigger className="bg-[#141210] border-[#2b2926] text-xs text-white font-mono rounded h-8 min-w-27.5 w-auto">
                    <SelectValue placeholder={locale === "tr" ? "Tümü" : "All"} />
                  </SelectTrigger>
                  <SelectContent position="popper" className="bg-[#141210] border-[#2b2926] text-[#E6E4DD]">
                    <SelectItem value="all" className="hover:bg-[#2b2926] text-xs font-mono">{locale === "tr" ? "Tümü" : "All"}</SelectItem>
                    {allLabels.map((lbl) => (
                      <SelectItem key={lbl} value={lbl} className="hover:bg-[#2b2926] text-xs font-mono">
                        {lbl.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Clear filters button */}
            {(searchQuery || selectedEnv !== "all" || selectedLabel !== "all") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedEnv("all");
                  setSelectedLabel("all");
                }}
                className="text-[10px] font-mono text-[#f25c55] hover:text-[#f25c55] hover:bg-[#2d1210]/30 h-8 px-3 rounded cursor-pointer"
              >
                {t("common.clear").toUpperCase()}
              </Button>
            )}
          </div>
        </div>

        {/* Databases Grid list */}
        {filteredDatabases.length === 0 ? (
          <div className="border border-dashed border-[#2b2926] rounded-lg p-16 text-center bg-[#0d0c0b]/40 shadow-inner">
            <IconDatabase size={40} className="mx-auto text-[#2b2926] mb-3" />
            <h3 className="text-sm font-mono text-[#a09e96] font-semibold">
              {databases.length === 0 ? t("database.noDbs") : "Eşleşen veritabanı bulunamadı."}
            </h3>
            <p className="text-[11px] text-[#605e58] mt-1 font-mono">
              {databases.length === 0 ? "Yedek almaya başlamak için yeni bir PostgreSQL bağlantısı ekleyin." : "Lütfen arama terimini veya filtreleri değiştirin."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDatabases.map((db) => {
              const isTesting = testingDbs[db.id] || false;
              const labelsArr = db.labels ? db.labels.split(",").map((l: string) => l.trim()).filter(Boolean) : [];
              const lastTestedStr = db.lastTestedAt 
                ? new Date(db.lastTestedAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US") 
                : t("database.neverTested") || "Hiç test edilmedi";

              return (
                <Card key={db.id} className="bg-[#0d0c0b] border-[#2b2926] rounded-md overflow-hidden hover:border-[#3e3b37] transition-all duration-300 flex flex-col justify-between shadow-2xl relative group">
                  {/* Status Indicator Bar at top */}
                  <div className={`h-1 w-full shrink-0 ${
                    db.status === "healthy" ? "bg-[#55f289]" : db.status === "offline" ? "bg-[#f25c55]" : "bg-[#a09e96]"
                  }`} />

                  <div>
                    {/* Header */}
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between">
                          <div className="space-y-1 max-w-[70%]">
                            <div className="flex items-center gap-2">
                              <DatabaseTypeMark />
                              <h4 className="min-w-0 truncate text-xs font-mono font-bold uppercase text-white" title={db.name}>
                                {db.name}
                              </h4>
                            </div>
                            <span className="text-[10px] font-mono text-[#605e58] truncate block" title={db.database}>
                              {db.database}
                            </span>
                          </div>

                        <Badge variant="outline" className={`text-[9px] font-mono border py-0.5 px-2 ${
                          db.environment === "production" 
                            ? "bg-[#2d1b10] border-[#4b2f1a] text-[#f29f55]" 
                            : db.environment === "staging"
                            ? "bg-[#10222d] border-[#1a3f4b] text-[#55b8f2]"
                            : "bg-[#1c1a17] border-[#2b2926] text-[#a09e96]"
                        }`}>
                          {db.environment.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>

                    {/* Content */}
                    <CardContent className="px-5 py-2 space-y-4 font-mono text-[11px] text-[#a09e96]">
                      {/* Host & Port */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-[#605e58] block tracking-wider uppercase">{t("database.connAddress") || "SUNUCU ADRESİ"}</span>
                        <span className="text-white truncate block">{db.host}:{db.port}</span>
                      </div>

                      {/* Connection Health & Status details */}
                      <div className="flex justify-between items-center bg-[#141210] border border-[#2b2926]/40 p-2 rounded">
                        <div className="space-y-0.5">
                          <span className="text-[8px] text-[#605e58] block tracking-wider uppercase">{t("database.lastTested") || "SON TEST"}</span>
                          <span className="text-[10px] text-[#E6E4DD] truncate block max-w-37.5">{lastTestedStr}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            db.status === "healthy" ? "bg-[#55f289] animate-pulse" : db.status === "offline" ? "bg-[#f25c55]" : "bg-[#a09e96]"
                          }`} />
                          <span className="text-[10px] text-white">
                            {db.status === "healthy" ? t("common.healthy") : db.status === "offline" ? t("common.offline") : t("common.untested")}
                          </span>
                        </div>
                      </div>

                      {/* Backup and Schedules Stats */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-[#141210]/40 border border-[#2b2926]/20 p-2 rounded flex items-center gap-2">
                          <IconFileZip size={14} className="text-[#a09e96] opacity-50" />
                          <div>
                            <span className="text-[#605e58] block">BACKUPS</span>
                            <span className="text-white font-bold">{db.backups?.length || 0}</span>
                          </div>
                        </div>
                        <div className="bg-[#141210]/40 border border-[#2b2926]/20 p-2 rounded flex items-center gap-2">
                          <IconClock size={14} className="text-[#a09e96] opacity-50" />
                          <div>
                            <span className="text-[#605e58] block">SCHEDULES</span>
                            <span className="text-white font-bold">{db.schedules?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </div>

                  {/* Footer (Labels and Actions) */}
                  <div className="p-5 pt-3 border-t border-[#2b2926]/60 space-y-3 bg-[#0c0b0a]/50">
                    {/* Labels row */}
                    <div className="flex flex-wrap gap-1 min-h-4.5">
                      {labelsArr.length === 0 ? (
                        <span className="text-[9px] text-[#605e58] italic flex items-center gap-1">
                          <IconTag size={10} />
                          no labels
                        </span>
                      ) : (
                        labelsArr.map((lbl: string) => (
                          <Badge 
                            key={lbl} 
                            variant="ghost" 
                            className="bg-[#141210] border border-[#2b2926] text-[9px] text-[#a09e96] py-0.2 px-1.5 rounded cursor-pointer hover:border-[#605e58]"
                            onClick={() => setSelectedLabel(lbl)}
                          >
                            #{lbl}
                          </Badge>
                        ))
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between pt-1">
                      {/* Left: Test Connection action */}
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={isTesting}
                        onClick={() => handleTestConnection(db.id)}
                        className="h-7 border-[#2b2926] text-[10px] text-[#E6E4DD] hover:bg-[#1c1a17] hover:text-white font-mono flex items-center gap-1 cursor-pointer rounded"
                      >
                        {isTesting ? (
                          <IconLoader2 size={12} className="animate-spin" />
                        ) : (
                          <IconRefresh size={12} />
                        )}
                        {(t("common.testConnection") || "Test Et").toUpperCase()}
                      </Button>

                      {/* Right: Quick actions panel */}
                      <div className="flex items-center gap-1">
                        {/* Explore Tables link */}
                        <Link href={`/databases/${db.id}`}>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-[#a09e96] hover:text-white hover:bg-[#1c1a17] rounded cursor-pointer" title="Veritabanı Gezgini">
                            <IconExternalLink size={14} />
                          </Button>
                        </Link>

                        {/* Backup manual action */}
                        <Button 
                          onClick={() => openBackupDialog(db)}
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 text-[#55f289] hover:bg-[#1b3224]/30 rounded cursor-pointer" 
                          title={t("backup.backupNow")}
                        >
                          <IconDatabaseExport size={14} />
                        </Button>

                        {/* Edit database modal */}
                        <DatabaseModal
                          database={db}
                          onSuccess={() => router.refresh()}
                          trigger={
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-[#a09e96] hover:text-white hover:bg-[#1c1a17] rounded cursor-pointer" title={t("common.edit")}>
                              {/* Using the IconEdit loaded via tabler-icons dynamically or inline */}
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                            </Button>
                          }
                        />

                        {/* Delete database action */}
                        <Button 
                          onClick={() => openDeleteDbDialog(db)}
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 text-[#f25c55] hover:bg-[#2d1210]/30 rounded cursor-pointer" 
                          title={t("common.delete")}
                        >
                          <IconTrash size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Backup Dialog Confirmation */}
      <Dialog open={backupOpen} onOpenChange={setBackupOpen}>
        <DialogContent className="max-w-125 bg-[#0d0c0b] text-[#E6E4DD] border border-[#2b2926] font-sans rounded-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono tracking-wider uppercase text-white flex items-center gap-2">
              <IconDatabase size={16} className="text-[#55f289]" />
              {t("backup.backupNow").toUpperCase()}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#a09e96] pt-1">
              {selectedDb?.name} ({selectedDb?.database}) veritabanı yedeğini anında başlatın.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4 font-mono text-xs">
            {/* Display DB size calculated dynamically */}
            <div className="flex justify-between border-b border-[#2b2926]/40 pb-2">
              <span className="text-[#605e58]">{t("backup.size")?.toUpperCase() || "BOYUT"}:</span>
              {loadingSize ? (
                <span className="flex items-center gap-1 text-white">
                  <IconLoader2 size={12} className="animate-spin" />
                  {t("common.loading")}
                </span>
              ) : sizeError ? (
                <span className="text-[#f25c55]">{t("common.unknown")?.toUpperCase() || "BİLİNMİYOR"}</span>
              ) : (
                <span className="text-white font-bold">{dbSize}</span>
              )}
            </div>

            {/* Custom Filename Field */}
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="custom-filename" className="text-[10px] tracking-wider uppercase text-[#a09e96] block">
                {t("backup.customFilenameLabel") || "Yedek Dosya Adı (Opsiyonel)"}
              </Label>
              <Input
                id="custom-filename"
                placeholder={t("backup.customFilenamePlaceholder") || "örn: veritabani_yedek"}
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                disabled={backingUp}
                className="bg-[#141210] border-[#2b2926] focus:border-[#d2541c] text-xs text-white rounded h-8 w-full"
              />
            </div>

            {/* Status alerts */}
            {backupResult && (
              <div className={`p-3 rounded border ${
                backupResult.success 
                  ? "bg-[#132219] border-[#1b3f2a] text-[#55f289]" 
                  : "bg-[#2d1210] border-[#4b1b1a] text-[#f25c55]"
              }`}>
                {backupResult.message}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={backingUp}
              onClick={() => { setBackupOpen(false); setSelectedDb(null); }}
              className="border-[#2b2926] text-[#E6E4DD] hover:bg-[#1c1a17] hover:text-white font-mono text-xs cursor-pointer rounded"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={backingUp}
              onClick={handleStartBackup}
              className="bg-[#1b3224] hover:bg-[#223f2d] text-white border border-[#2b4c37] font-mono text-xs cursor-pointer rounded"
            >
              {backingUp ? (
                <span className="flex items-center gap-1">
                  <IconLoader2 size={12} className="animate-spin" />
                  {t("common.loading")}
                </span>
              ) : (
                t("backup.backupNow")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Database Dialog Confirmation */}
      <Dialog open={deleteDbOpen} onOpenChange={setDeleteDbOpen}>
        <DialogContent className="max-w-112.5 bg-[#0d0c0b] text-[#E6E4DD] border border-[#2b2926] font-sans rounded-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono tracking-wider uppercase text-white flex items-center gap-2">
              <IconAlertCircle size={16} className="text-[#f25c55]" />
              {t("common.delete")?.toUpperCase() || "SİL"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#a09e96] pt-1">
              {t("database.deleteConfirm") || "Bu veritabanı bağlantısını silmek istediğinize emin misiniz?"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-1 font-mono text-xs border-y border-[#2b2926]/40 my-3">
            <div className="flex justify-between">
              <span className="text-[#605e58]">KISA AD:</span>
              <span className="text-white font-bold">{dbToDelete?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#605e58]">VERİTABANI ADI:</span>
              <span className="text-white">{dbToDelete?.database}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#605e58]">ADRES:</span>
              <span className="text-[#a09e96]">{dbToDelete?.host}:{dbToDelete?.port}</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={deletingDb}
              onClick={() => { setDeleteDbOpen(false); setDbToDelete(null); }}
              className="border-[#2b2926] text-[#E6E4DD] hover:bg-[#1c1a17] hover:text-white font-mono text-xs cursor-pointer rounded"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={deletingDb}
              onClick={handleDeleteDb}
              className="bg-[#2d1210] hover:bg-[#3f1614] text-[#f25c55] border border-[#4b1b1a] font-mono text-xs cursor-pointer rounded"
            >
              {deletingDb ? (
                <span className="flex items-center gap-1">
                  <IconLoader2 size={12} className="animate-spin" />
                  {t("common.loading")}
                </span>
              ) : (
                t("common.delete")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
