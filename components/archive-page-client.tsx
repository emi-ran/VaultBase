"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  IconSearch, 
  IconTrash, 
  IconDownload, 
  IconArchive, 
  IconServer, 
  IconAlertCircle, 
  IconCheck, 
  IconLoader2, 
  IconRefresh, 
  IconDatabase, 
  IconChevronLeft, 
  IconChevronRight,
  IconUpload
} from "@tabler/icons-react";
import { useTranslation } from "./i18n-provider";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "./ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "./ui/table";
import { deleteBackupAction, clearAllBackupsAction, restoreFromArchiveAction } from "../app/actions";

// Format bytes helper
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

interface ArchivePageClientProps {
  initialBackups: any[];
  databases: any[];
  locale: string;
}

export function ArchivePageClient({ initialBackups, databases, locale }: ArchivePageClientProps) {
  const { t } = useTranslation();
  const router = useRouter();

  // Backups state
  const [backups, setBackups] = useState(initialBackups);

  // Sync state if initialBackups updates from server components
  useEffect(() => {
    setBackups(initialBackups);
  }, [initialBackups]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDbId, setSelectedDbId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTrigger, setSelectedTrigger] = useState<string>("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [deleteBackupOpen, setDeleteBackupOpen] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<any>(null);
  const [deletingBackup, setDeletingBackup] = useState(false);

  const [clearArchiveOpen, setClearArchiveOpen] = useState(false);
  const [clearingArchive, setClearingArchive] = useState(false);

  // Restore dialog state
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState<any>(null);
  const [restoreTargetId, setRestoreTargetId] = useState<string>("");
  const [restoreAcknowledged, setRestoreAcknowledged] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string } | null>(null);

  // Reset page number when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDbId, selectedStatus, selectedTrigger]);

  // Statistics
  const stats = useMemo(() => {
    const total = backups.length;
    const successful = backups.filter((j) => j.status === "success").length;
    const failed = backups.filter((j) => j.status === "failed").length;
    const totalBytes = backups
      .filter((j) => j.status === "success")
      .reduce((sum, j) => sum + (j.sizeBytes || 0), 0);

    return {
      total,
      successful,
      failed,
      totalSize: formatBytes(totalBytes),
    };
  }, [backups]);

  // Filtered Backups
  const filteredBackups = useMemo(() => {
    return backups.filter((job) => {
      const filenameMatch = job.filename.toLowerCase().includes(searchQuery.toLowerCase());
      const dbNameMatch = (job.database?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSearch = filenameMatch || dbNameMatch;

      const matchesDb = selectedDbId === "all" || job.databaseId === selectedDbId;
      const matchesStatus = selectedStatus === "all" || job.status === selectedStatus;
      const matchesTrigger = selectedTrigger === "all" || job.triggerType === selectedTrigger;

      return matchesSearch && matchesDb && matchesStatus && matchesTrigger;
    });
  }, [backups, searchQuery, selectedDbId, selectedStatus, selectedTrigger]);

  // Paginated Backups
  const paginatedBackups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBackups.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBackups, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredBackups.length / itemsPerPage));

  // Handlers
  const openDeleteDialog = (job: any) => {
    setBackupToDelete(job);
    setDeleteBackupOpen(true);
  };

  const handleDeleteBackup = async () => {
    if (!backupToDelete) return;
    setDeletingBackup(true);
    try {
      const res = await deleteBackupAction(backupToDelete.id);
      if (res.success) {
        setBackups((prev) => prev.filter((j) => j.id !== backupToDelete.id));
        setDeleteBackupOpen(false);
        setBackupToDelete(null);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to delete backup:", err);
    } finally {
      setDeletingBackup(false);
    }
  };

  const handleClearArchive = async () => {
    setClearingArchive(true);
    try {
      const res = await clearAllBackupsAction();
      if (res.success) {
        setBackups([]);
        setClearArchiveOpen(false);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to clear archive:", err);
    } finally {
      setClearingArchive(false);
    }
  };

  // Restore handlers
  const openRestoreDialog = (job: any) => {
    setBackupToRestore(job);
    setRestoreTargetId(job.databaseId || "");
    setRestoreAcknowledged(false);
    setRestoreResult(null);
    setRestoreOpen(true);
  };

  const handleStartRestore = async () => {
    if (!backupToRestore || !restoreTargetId) return;
    setRestoring(true);
    setRestoreResult(null);
    try {
      const res = await restoreFromArchiveAction(backupToRestore.id, restoreTargetId);
      if (res.success) {
        setRestoreResult({ success: true, message: t("restore.success") });
        setTimeout(() => {
          setRestoreOpen(false);
          setBackupToRestore(null);
          router.refresh();
        }, 2000);
      } else {
        setRestoreResult({ success: false, message: t("restore.failed") + (res.error || "") });
      }
    } catch (err: any) {
      setRestoreResult({ success: false, message: t("restore.failed") + (err.message || "") });
    } finally {
      setRestoring(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedDbId("all");
    setSelectedStatus("all");
    setSelectedTrigger("all");
  };

  const hasActiveFilters = searchQuery !== "" || selectedDbId !== "all" || selectedStatus !== "all" || selectedTrigger !== "all";

  return (
    <div className="flex-1 flex flex-col overflow-y-auto font-sans bg-[#090807] text-[#E6E4DD]">
      {/* Header */}
      <header className="h-16 border-b border-[#2b2926] px-8 flex items-center justify-between shrink-0 bg-[#0d0c0b]">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-mono tracking-wider font-bold text-white uppercase">
            {t("backup.archive")}
          </h2>
          <span className="text-[10px] font-mono text-[#605e58] border border-[#2b2926] px-2 py-0.5 rounded uppercase">
            {backups.length} {t("stats.totalStored").split(" ")[1] || "Yedek"}
          </span>
        </div>

        {backups.length > 0 && (
          <Button 
            onClick={() => setClearArchiveOpen(true)}
            variant="outline" 
            className="border-[#2d1210] text-[#f25c55] hover:bg-[#2d1210]/20 hover:border-[#f25c55]/30 text-[10px] font-mono h-8 px-4 rounded cursor-pointer transition-all duration-200"
          >
            {t("common.clear").toUpperCase()}
          </Button>
        )}
      </header>

      {/* Main Content Area */}
      <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat 1: Total Backups */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("backup.statsTotal") || "TOPLAM YEDEK"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-mono font-bold text-white">
                  {stats.total}
                </span>
                <span className="text-[10px] font-mono text-[#605e58]">{t("stats.totalStored").split(" ")[1] || "YEDEK"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Stat 2: Total Stored Size */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("backup.statsTotalSize") || "TOPLAM SAKLANAN"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-mono font-bold text-[#55f289]">
                  {stats.totalSize}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Stat 3: Successful Backups */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("backup.statsSuccess") || "BAŞARILI YEDEK"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-mono font-bold text-white flex items-center gap-1.5">
                  <IconCheck size={16} className="text-[#55f289]" />
                  {stats.successful}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Stat 4: Failed Backups */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("backup.statsFailed") || "BAŞARISIZ YEDEK"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-mono font-bold text-white flex items-center gap-1.5">
                  <IconAlertCircle size={16} className={stats.failed > 0 ? "text-[#f25c55]" : "text-[#605e58]"} />
                  {stats.failed}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Controls Card */}
        <div className="bg-[#0d0c0b] border border-[#2b2926] rounded-md p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Search Input */}
            <div className="space-y-1.5">
              <Label htmlFor="search" className="text-[10px] font-mono tracking-wider uppercase text-[#a09e96]">
                {t("database.searchPlaceholder").split(" ")[0] || "ARA"}
              </Label>
              <div className="relative">
                <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#605e58]" />
                <Input
                  id="search"
                  placeholder={t("backup.searchPlaceholder") || "Dosya adı ile ara..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#141210] border-[#2b2926] text-xs font-mono text-white rounded pl-9 h-9 w-full placeholder:text-[#605e58] focus:border-[#55f289]/40 transition-colors"
                />
              </div>
            </div>

            {/* Database Filter Select */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono tracking-wider uppercase text-[#a09e96]">
                {t("schedules.database") || "VERİTABANI"}
              </Label>
              <Select value={selectedDbId} onValueChange={setSelectedDbId}>
                <SelectTrigger className="bg-[#141210] border-[#2b2926] text-xs text-white font-mono rounded h-9 w-full">
                  <SelectValue placeholder={t("backup.filterDb") || "Tüm Veritabanları"} />
                </SelectTrigger>
                <SelectContent position="popper" className="bg-[#141210] border-[#2b2926] text-[#E6E4DD]">
                  <SelectItem value="all">{t("backup.filterDb") || "Tüm Veritabanları"}</SelectItem>
                  {databases.map((db) => (
                    <SelectItem key={db.id} value={db.id}>
                      {db.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter Select */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono tracking-wider uppercase text-[#a09e96]">
                {t("database.status") || "DURUM"}
              </Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="bg-[#141210] border-[#2b2926] text-xs text-white font-mono rounded h-9 w-full">
                  <SelectValue placeholder={t("backup.filterStatus") || "Tüm Durumlar"} />
                </SelectTrigger>
                <SelectContent position="popper" className="bg-[#141210] border-[#2b2926] text-[#E6E4DD]">
                  <SelectItem value="all">{t("backup.filterStatus") || "Tüm Durumlar"}</SelectItem>
                  <SelectItem value="success">{t("common.success") || "Başarılı"}</SelectItem>
                  <SelectItem value="failed">{t("common.error") || "Hata"}</SelectItem>
                  <SelectItem value="processing">{t("common.loading").replace("...", "") || "Yükleniyor"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Trigger Filter Select */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono tracking-wider uppercase text-[#a09e96]">
                {t("backup.trigger") || "TETİKLEYİCİ"}
              </Label>
              <Select value={selectedTrigger} onValueChange={setSelectedTrigger}>
                <SelectTrigger className="bg-[#141210] border-[#2b2926] text-xs text-white font-mono rounded h-9 w-full">
                  <SelectValue placeholder={t("backup.filterTrigger") || "Tüm Tetikleyiciler"} />
                </SelectTrigger>
                <SelectContent position="popper" className="bg-[#141210] border-[#2b2926] text-[#E6E4DD]">
                  <SelectItem value="all">{t("backup.filterTrigger") || "Tüm Tetikleyiciler"}</SelectItem>
                  <SelectItem value="manual">{t("jobs.manual") || "Manuel"}</SelectItem>
                  <SelectItem value="scheduled">{t("jobs.scheduled") || "Zamanlanmış"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reset Filters Option */}
          {hasActiveFilters && (
            <div className="flex justify-end pt-1">
              <Button
                onClick={resetFilters}
                variant="ghost"
                className="text-xs font-mono text-[#a09e96] hover:text-white hover:bg-[#141210] rounded h-7 px-3 flex items-center gap-1.5 cursor-pointer"
              >
                <IconRefresh size={12} />
                Filtreleri Temizle
              </Button>
            </div>
          )}
        </div>

        {/* Backups Table Card */}
        <div className="bg-[#0d0c0b] border border-[#2b2926] rounded-md overflow-hidden">
          {filteredBackups.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-[#605e58] space-y-2">
              <IconArchive size={28} className="mx-auto text-[#2b2926]" />
              <p>{t("backup.noBackups") || "Henüz tamamlanmış yedek dosyası yok"}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader className="bg-[#141210] border-b border-[#2b2926]">
                  <TableRow className="border-b border-[#2b2926] hover:bg-[#141210]">
                    <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase px-6">
                      {t("backup.filename")}
                    </TableHead>
                    <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase">
                      {t("schedules.database") || "VERİTABANI"}
                    </TableHead>
                    <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase">
                      {t("backup.size")}
                    </TableHead>
                    <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase">
                      {t("backup.date")}
                    </TableHead>
                    <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase">
                      {t("backup.trigger")}
                    </TableHead>
                    <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase text-right px-6">
                      {t("common.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBackups.map((job) => (
                    <TableRow key={job.id} className="border-b border-[#2b2926]/40 hover:bg-[#141210]/40">
                      
                      {/* Filename & Status */}
                      <TableCell className="font-mono text-xs text-white max-w-[280px] truncate px-6" title={job.filename}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            job.status === "success" 
                              ? "bg-[#55f289]" 
                              : job.status === "failed" 
                              ? "bg-[#f25c55]" 
                              : "bg-[#f2b855] animate-pulse"
                          }`} />
                          <span className="truncate">{job.filename}</span>
                        </div>
                        {job.errorMessage && (
                          <span className="text-[9px] text-[#f25c55] block font-mono pl-4 truncate max-w-[260px] mt-0.5" title={job.errorMessage}>
                            {job.errorMessage}
                          </span>
                        )}
                      </TableCell>

                      {/* Database Name */}
                      <TableCell className="font-mono text-xs text-[#a09e96]">
                        <div className="flex items-center gap-1.5">
                          <IconDatabase size={12} className="text-[#605e58]" />
                          <span>{job.database?.name || t("common.none")}</span>
                        </div>
                      </TableCell>

                      {/* Size */}
                      <TableCell className="font-mono text-xs text-[#a09e96]">
                        {job.status === "success" ? formatBytes(job.sizeBytes) : "-"}
                      </TableCell>

                      {/* Created At */}
                      <TableCell className="font-mono text-xs text-[#a09e96]">
                        {new Date(job.createdAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}
                      </TableCell>

                      {/* Trigger Badge */}
                      <TableCell>
                        <Badge variant="outline" className={`text-[9px] font-mono border ${
                          job.triggerType === "scheduled" 
                            ? "bg-[#10222d] border-[#1a3f4b] text-[#55b8f2]"
                            : "bg-[#1c1a17] border-[#2b2926] text-[#a09e96]"
                        }`}>
                          {job.triggerType.toUpperCase()}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right px-6 space-x-1.5">
                        {job.status === "success" && (
                          <>
                            <a href={`/api/backups/${job.id}`} download>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-[#55f289] hover:bg-[#1b3224]/30 rounded cursor-pointer transition-colors" 
                                title={t("backup.download")}
                              >
                                <IconDownload size={14} />
                              </Button>
                            </a>
                            <Button 
                              onClick={() => openRestoreDialog(job)}
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-[#e6b04e] hover:bg-[#2b2310]/30 rounded cursor-pointer transition-colors" 
                              title={t("restore.fromArchive")}
                            >
                              <IconUpload size={14} />
                            </Button>
                          </>
                        )}
                        
                        <Button 
                          onClick={() => openDeleteDialog(job)}
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-[#f25c55] hover:bg-[#2d1210]/30 rounded cursor-pointer transition-colors" 
                          title={t("common.delete")}
                        >
                          <IconTrash size={14} />
                        </Button>
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-[#2b2926] bg-[#141210]/30 flex items-center justify-between font-mono text-xs text-[#605e58]">
                  <span>
                    {t("backup.paginationInfo")
                      .replace("{start}", String((currentPage - 1) * itemsPerPage + 1))
                      .replace("{end}", String(Math.min(currentPage * itemsPerPage, filteredBackups.length)))
                      .replace("{total}", String(filteredBackups.length))}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <Button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      variant="ghost"
                      className="h-8 w-8 p-0 rounded hover:bg-[#141210] hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <IconChevronLeft size={16} />
                    </Button>
                    <span className="text-white font-bold px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      variant="ghost"
                      className="h-8 w-8 p-0 rounded hover:bg-[#141210] hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <IconChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* CONFIRMATION DIALOG: Delete Backup */}
      <Dialog open={deleteBackupOpen} onOpenChange={(v) => { if (!deletingBackup) setDeleteBackupOpen(v); }}>
        <DialogContent className="max-w-[450px] sm:max-w-[450px] w-full bg-[#0d0c0b] text-[#E6E4DD] border border-[#2b2926] rounded-md shadow-2xl p-6 font-sans">
          <DialogHeader className="pb-3 border-b border-[#2b2926]">
            <DialogTitle className="text-sm font-mono tracking-wider uppercase text-white flex items-center gap-2">
              <IconAlertCircle size={16} className="text-[#f25c55]" />
              Yedek Dosyasını Sil
            </DialogTitle>
            <DialogDescription className="text-xs text-[#a09e96] pt-1 leading-relaxed">
              {t("backup.deleteConfirm")}
            </DialogDescription>
          </DialogHeader>

          {backupToDelete && (
            <div className="py-4 space-y-2 font-mono text-xs text-[#a09e96]">
              <div className="flex flex-col gap-1 border-b border-[#2b2926]/40 pb-2">
                <span>Dosya Adı:</span>
                <span className="text-white font-bold break-all">{backupToDelete.filename}</span>
              </div>
              <div className="flex justify-between border-b border-[#2b2926]/40 pb-2">
                <span>Veritabanı:</span>
                <span className="text-white">{backupToDelete.database?.name || t("common.none")}</span>
              </div>
              <div className="flex justify-between border-b border-[#2b2926]/40 pb-2">
                <span>Boyut:</span>
                <span className="text-white">{backupToDelete.status === "success" ? formatBytes(backupToDelete.sizeBytes) : "-"}</span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-[#2b2926] gap-2 sm:gap-0">
            <Button
              onClick={() => { setDeleteBackupOpen(false); setBackupToDelete(null); }}
              disabled={deletingBackup}
              variant="ghost"
              className="border border-[#2b2926] text-xs font-mono rounded h-8 px-4 text-[#a09e96] hover:bg-[#141210] hover:text-white cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleDeleteBackup}
              disabled={deletingBackup}
              className="bg-[#2d1210] border border-[#f25c55]/30 text-xs font-mono rounded h-8 px-4 text-[#f25c55] hover:bg-[#2d1210]/60 cursor-pointer flex items-center gap-1.5"
            >
              {deletingBackup && <IconLoader2 size={12} className="animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG: Clear Archive */}
      <Dialog open={clearArchiveOpen} onOpenChange={(v) => { if (!clearingArchive) setClearArchiveOpen(v); }}>
        <DialogContent className="max-w-[450px] sm:max-w-[450px] w-full bg-[#0d0c0b] text-[#E6E4DD] border border-[#2b2926] rounded-md shadow-2xl p-6 font-sans">
          <DialogHeader className="pb-3 border-b border-[#2b2926]">
            <DialogTitle className="text-sm font-mono tracking-wider uppercase text-white flex items-center gap-2">
              <IconAlertCircle size={16} className="text-[#f25c55]" />
              Yedek Arşivini Temizle
            </DialogTitle>
            <DialogDescription className="text-xs text-[#a09e96] pt-1 leading-relaxed">
              {t("backup.clearArchiveConfirm") || "Tüm yedek arşivini silmek ve diskteki dosyaları temizlemek istediğinize emin misiniz? Bu işlem geri alınamaz."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 border-t border-[#2b2926] gap-2 sm:gap-0">
            <Button
              onClick={() => setClearArchiveOpen(false)}
              disabled={clearingArchive}
              variant="ghost"
              className="border border-[#2b2926] text-xs font-mono rounded h-8 px-4 text-[#a09e96] hover:bg-[#141210] hover:text-white cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleClearArchive}
              disabled={clearingArchive}
              className="bg-[#2d1210] border border-[#f25c55]/30 text-xs font-mono rounded h-8 px-4 text-[#f25c55] hover:bg-[#2d1210]/60 cursor-pointer flex items-center gap-1.5"
            >
              {clearingArchive && <IconLoader2 size={12} className="animate-spin" />}
              {t("common.clear").toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG: Restore from Archive */}
      <Dialog open={restoreOpen} onOpenChange={(v) => { if (!restoring) { setRestoreOpen(v); setRestoreResult(null); } }}>
        <DialogContent className="max-w-[500px] sm:max-w-[500px] w-full bg-[#0d0c0b] text-[#E6E4DD] border border-[#2b2926] rounded-md shadow-2xl p-6 font-sans">
          <DialogHeader className="pb-3 border-b border-[#2b2926]">
            <DialogTitle className="text-sm font-mono tracking-wider uppercase text-white flex items-center gap-2">
              <IconUpload size={16} className="text-[#e6b04e]" />
              {t("restore.fromArchive")?.toUpperCase() || "ARŞİVDEN GERİ YÜKLE"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#a09e96] pt-1 leading-relaxed">
              {t("restore.archiveDesc") || "Arşivdeki bir yedek dosyasını seçerek hedef veritabanına geri yükleyin."}
            </DialogDescription>
          </DialogHeader>

          {backupToRestore && (
            <div className="py-4 space-y-4 font-mono text-xs">
              {/* Backup Info */}
              <div className="bg-[#141210] border border-[#2b2926] rounded p-3 space-y-1.5">
                <span className="text-[9px] text-[#605e58] tracking-wider uppercase">{t("restore.backupInfo") || "YEDEK BİLGİSİ"}</span>
                <div className="flex items-center gap-2">
                  <IconDatabase size={14} className="text-[#55f289]" />
                  <span className="text-white font-bold text-sm truncate">{backupToRestore.filename}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#605e58]">{t("restore.sourceDb") || "Kaynak DB"}: {backupToRestore.database?.name || t("common.none")}</span>
                  <span className="text-[#a09e96]">{t("restore.fileSize") || "Boyut"}: {formatBytes(backupToRestore.sizeBytes)}</span>
                </div>
                <div className="text-[10px] text-[#605e58]">
                  {t("restore.archivedDate") || "Tarih"}: {new Date(backupToRestore.createdAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}
                </div>
              </div>

              {/* Target Database Selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-[#a09e96]">
                  {t("restore.selectTargetDb") || "Hedef Veritabanı Seç"}
                </Label>
                <Select value={restoreTargetId} onValueChange={setRestoreTargetId}>
                  <SelectTrigger className="bg-[#141210] border-[#2b2926] text-xs text-white font-mono rounded h-9 w-full">
                    <SelectValue placeholder={t("restore.selectTargetDb") || "Hedef Veritabanı Seç"} />
                  </SelectTrigger>
                  <SelectContent position="popper" className="bg-[#141210] border-[#2b2926] text-[#E6E4DD]">
                    {databases.map((db) => (
                      <SelectItem key={db.id} value={db.id}>
                        {db.name} ({db.host}:{db.port}/{db.database})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target DB Environment Warning */}
              {restoreTargetId && (() => {
                const targetDb = databases.find((d: any) => d.id === restoreTargetId)
                if (!targetDb) return null
                return (
                  <>
                    {targetDb.environment === "production" && (
                      <div className="bg-[#2d1210] border border-[#4b1b1a] rounded p-3 flex items-start gap-2">
                        <IconAlertCircle size={14} className="text-[#f25c55] shrink-0 mt-0.5" />
                        <span className="text-[11px] text-[#f25c55]">
                          {t("restore.productionWarning") || "Bu bir PRODUCTION veritabanıdır!"}
                        </span>
                      </div>
                    )}

                    {/* Critical Warning */}
                    <div className="bg-[#1a0e0e] border border-[#3a1818] rounded p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <IconAlertCircle size={14} className="text-[#f25c55]" />
                        <span className="text-[11px] font-bold text-[#f25c55] tracking-wider uppercase">
                          {t("restore.warningTitle") || "VERİ KAYBI UYARISI"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#f25c55]/90 leading-relaxed">
                        {(t("restore.warningText") || "Bu işlem hedef veritabanındaki tüm mevcut tabloları ve verileri SİLECEKTİR. İşlem geri alınamaz.")}
                      </p>
                    </div>

                    {/* Acknowledgement Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restoreAcknowledged}
                        disabled={restoring}
                        onChange={(e) => setRestoreAcknowledged(e.target.checked)}
                        className="mt-0.5 accent-[#e6b04e]"
                      />
                      <span className="text-[11px] leading-relaxed text-[#a09e96]">
                        {(t("restore.confirmLabel") || "Veri kaybı riskini anlıyorum ve geri yüklemeyi başlatmak istiyorum.")}
                      </span>
                    </label>
                  </>
                )
              })()}

              {/* Result alert */}
              {restoreResult && (
                <div className={`p-3 rounded border text-xs ${
                  restoreResult.success
                    ? "bg-[#132219] border-[#1b3f2a] text-[#55f289]"
                    : "bg-[#2d1210] border-[#4b1b1a] text-[#f25c55]"
                }`}>
                  {restoreResult.message}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-[#2b2926] gap-2 sm:gap-0">
            <Button
              onClick={() => { setRestoreOpen(false); setBackupToRestore(null); setRestoreResult(null); }}
              disabled={restoring}
              variant="ghost"
              className="border border-[#2b2926] text-xs font-mono rounded h-8 px-4 text-[#a09e96] hover:bg-[#141210] hover:text-white cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleStartRestore}
              disabled={!restoreTargetId || !restoreAcknowledged || restoring}
              className={`text-xs font-mono rounded h-8 px-4 cursor-pointer flex items-center gap-1.5 ${
                !restoreTargetId || !restoreAcknowledged
                  ? "bg-[#2b2926] text-[#605e58] cursor-not-allowed"
                  : "bg-[#2d1210] border border-[#f25c55]/30 text-[#f25c55] hover:bg-[#2d1210]/60"
              }`}
            >
              {restoring && <IconLoader2 size={12} className="animate-spin" />}
              {restoring ? t("restore.processing") : t("restore.startButton")?.toUpperCase() || "GERİ YÜKLE"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
