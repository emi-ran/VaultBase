"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  IconDatabase, 
  IconDatabaseExport, 
  IconTrash, 
  IconDownload, 
  IconExternalLink,
  IconAlertCircle,
  IconLoader2
} from "@tabler/icons-react";
import { useTranslation } from "./i18n-provider";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { DatabaseTypeMark } from "./database-type-mark";
import { 
  triggerBackupAction, 
  deleteDatabaseAction, 
  deleteBackupAction, 
  clearAllBackupsAction,
  getDatabaseSizeAction
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

interface DashboardTablesProps {
  databases: any[];
  backups: any[];
  locale: string;
}

export function DashboardTables({ databases, backups, locale }: DashboardTablesProps) {
  const { t } = useTranslation();

  // Dialog State: Backup Confirm
  const [backupOpen, setBackupOpen] = useState(false);
  const [selectedDb, setSelectedDb] = useState<any>(null);
  const [dbSize, setDbSize] = useState<string | null>(null);
  const [loadingSize, setLoadingSize] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<{ success: boolean; message: string } | null>(null);
  const [customFilename, setCustomFilename] = useState("");

  // Dialog State: Delete Database Confirm
  const [deleteDbOpen, setDeleteDbOpen] = useState(false);
  const [dbToDelete, setDbToDelete] = useState<any>(null);
  const [deletingDb, setDeletingDb] = useState(false);

  // Dialog State: Delete Backup Confirm
  const [deleteBackupOpen, setDeleteBackupOpen] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<any>(null);
  const [deletingBackup, setDeletingBackup] = useState(false);

  // Dialog State: Clear Archive Confirm
  const [clearArchiveOpen, setClearArchiveOpen] = useState(false);
  const [clearingArchive, setClearingArchive] = useState(false);

  // Trigger Backup Dialog Open and calculate DB size dynamically
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

  // Delete DB Handler
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
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingDb(false);
    }
  };

  // Delete Backup Handler
  const openDeleteBackupDialog = (job: any) => {
    setBackupToDelete(job);
    setDeleteBackupOpen(true);
  };

  const handleDeleteBackup = async () => {
    if (!backupToDelete) return;
    setDeletingBackup(true);
    try {
      await deleteBackupAction(backupToDelete.id);
      setDeleteBackupOpen(false);
      setBackupToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingBackup(false);
    }
  };

  // Clear Archive Handler
  const handleClearArchive = async () => {
    setClearingArchive(true);
    try {
      await clearAllBackupsAction();
      setClearArchiveOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setClearingArchive(false);
    }
  };

  return (
    <>
      {/* Databases Table Section */}
      <div className="bg-[#0d0c0b] border border-[#2b2926] rounded-md overflow-hidden">
        <div className="p-6 border-b border-[#2b2926] flex flex-row items-center justify-between">
          <h3 className="text-xs font-mono font-bold tracking-wider text-white uppercase">
            {t("database.status")}
          </h3>
        </div>
        <div>
          {databases.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-[#605e58]">
              {t("database.noDbs")}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#141210] border-b border-[#2b2926]">
                <TableRow className="border-b border-[#2b2926] hover:bg-[#141210]">
                  <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase px-6">{t("database.shortName")}</TableHead>
                  <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase">{t("database.environment")}</TableHead>
                  <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase">{t("database.host")}</TableHead>
                  <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase">{t("common.systemHealth")}</TableHead>
                  <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase text-right px-6">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {databases.map((db) => (
                  <TableRow key={db.id} className="border-b border-[#2b2926]/40 hover:bg-[#141210]/40">
                    <TableCell className="font-mono font-bold text-xs text-white px-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <DatabaseTypeMark />
                          <span className="min-w-0 truncate">{db.name}</span>
                        </div>
                        <span className="text-[9px] text-[#605e58] font-normal">{db.database}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[9px] font-mono border ${
                        db.environment === "production" 
                          ? "bg-[#2d1b10] border-[#4b2f1a] text-[#f29f55]" 
                          : db.environment === "staging"
                          ? "bg-[#10222d] border-[#1a3f4b] text-[#55b8f2]"
                          : "bg-[#1c1a17] border-[#2b2926] text-[#a09e96]"
                      }`}>
                        {db.environment.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#a09e96]">{db.host}:{db.port}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-xs font-mono">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          db.status === "healthy" ? "bg-[#55f289]" : db.status === "offline" ? "bg-[#f25c55]" : "bg-[#a09e96]"
                        }`} />
                        {db.status === "healthy" ? t("common.healthy") : db.status === "offline" ? t("common.offline") : t("common.untested")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right px-6 space-x-2">
                      <Link href={`/databases/${db.id}`}>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-[#a09e96] hover:text-white hover:bg-[#1c1a17] rounded cursor-pointer" title="Gezgin">
                          <IconExternalLink size={14} />
                        </Button>
                      </Link>
                      
                      <Button 
                        onClick={() => openBackupDialog(db)}
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-[#55f289] hover:bg-[#1b3224]/30 rounded cursor-pointer" 
                        title={t("backup.backupNow")}
                      >
                        <IconDatabaseExport size={14} />
                      </Button>

                      <Button 
                        onClick={() => openDeleteDbDialog(db)}
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-[#f25c55] hover:bg-[#2d1210]/30 rounded cursor-pointer" 
                        title={t("common.delete")}
                      >
                        <IconTrash size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Backups Table Section */}
      <div className="bg-[#0d0c0b] border border-[#2b2926] rounded-md overflow-hidden">
        <div className="p-6 border-b border-[#2b2926] flex flex-row items-center justify-between">
          <h3 className="text-xs font-mono font-bold tracking-wider text-white uppercase">
            {t("backup.archive")}
          </h3>
          {backups.length > 0 && (
            <Button 
              onClick={() => setClearArchiveOpen(true)}
              variant="outline" 
              className="border-[#2b2926] hover:bg-[#2d1210]/20 hover:text-[#f25c55] hover:border-[#f25c55]/30 text-[10px] font-mono h-7 px-3 rounded cursor-pointer"
            >
              {t("common.clear").toUpperCase()}
            </Button>
          )}
        </div>
        <div>
          {backups.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-[#605e58]">
              {t("backup.noBackups")}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#141210] border-b border-[#2b2926]">
                <TableRow className="border-b border-[#2b2926] hover:bg-[#141210]">
                  <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase px-6">{t("backup.filename")}</TableHead>
                  <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase">{t("backup.size")}</TableHead>
                  <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase">{t("backup.date")}</TableHead>
                  <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase">{t("backup.trigger")}</TableHead>
                  <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase text-right px-6">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((job) => (
                  <TableRow key={job.id} className="border-b border-[#2b2926]/40 hover:bg-[#141210]/40">
                    <TableCell className="font-mono text-xs text-white max-w-[200px] truncate px-6" title={job.filename}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          job.status === "success" ? "bg-[#55f289]" : job.status === "failed" ? "bg-[#f25c55]" : "bg-[#f2b855] animate-pulse"
                        }`} />
                        <span>{job.filename}</span>
                      </div>
                      {job.errorMessage && (
                        <span className="text-[9px] text-[#f25c55] block font-mono pl-4 truncate max-w-[180px]" title={job.errorMessage}>
                          {job.errorMessage}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#a09e96]">
                      {job.status === "success" ? formatBytes(job.sizeBytes) : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#a09e96]">
                      {new Date(job.createdAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] font-mono border bg-[#1c1a17] border-[#2b2926] text-[#a09e96]">
                        {job.triggerType.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-6 space-x-2">
                      {job.status === "success" && (
                        <a href={`/api/backups/${job.id}`} download>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-[#55f289] hover:bg-[#1b3224]/30 rounded cursor-pointer" title={t("backup.download")}>
                            <IconDownload size={14} />
                          </Button>
                        </a>
                      )}
                      
                      <Button 
                        onClick={() => openDeleteBackupDialog(job)}
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-[#f25c55] hover:bg-[#2d1210]/30 rounded cursor-pointer" 
                        title={t("common.delete")}
                      >
                        <IconTrash size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* CONFIRMATION DIALOG 1: Database Backup Confirmation */}
      <Dialog open={backupOpen} onOpenChange={(v) => { if (!backingUp) setBackupOpen(v); }}>
        <DialogContent className="max-w-[450px] sm:max-w-[450px] w-full bg-[#0d0c0b] text-[#E6E4DD] border border-[#2b2926] rounded-md shadow-2xl p-6 font-sans">
          <DialogHeader className="pb-3 border-b border-[#2b2926]">
            <DialogTitle className="text-sm font-mono tracking-wider uppercase text-white flex items-center gap-2">
              <IconDatabaseExport size={16} className="text-[#55f289]" />
              Yedeklemeyi Başlat
            </DialogTitle>
            <DialogDescription className="text-xs text-[#a09e96] pt-1 leading-relaxed">
              <strong>{selectedDb?.name}</strong> veritabanı için yedekleme işlemi başlatılacak.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3 font-mono text-xs text-[#a09e96]">
            <div className="flex justify-between border-b border-[#2b2926]/40 pb-2">
              <span>Veritabanı:</span>
              <span className="text-white font-bold">{selectedDb?.database}</span>
            </div>
            <div className="flex justify-between border-b border-[#2b2926]/40 pb-2">
              <span>Bağlantı:</span>
              <span className="text-white">{selectedDb?.host}:{selectedDb?.port}</span>
            </div>
            <div className="flex justify-between border-b border-[#2b2926]/40 pb-2 items-center">
              <span>Tahmini Veri Boyutu:</span>
              <span className="text-[#55f289] font-bold">
                {loadingSize ? (
                  <span className="flex items-center gap-1">
                    <IconLoader2 size={12} className="animate-spin text-[#605e58]" />
                    Hesaplanıyor...
                  </span>
                ) : sizeError ? (
                  <span className="text-[#f25c55]">Bağlantı Hatası (Hesaplanamadı)</span>
                ) : (
                  dbSize
                )}
              </span>
            </div>
          </div>

          <div className="space-y-2 py-2">
            <Label htmlFor="custom-filename" className="text-xs font-mono text-[#a09e96]">
              {t("backup.customFilenameLabel")}
            </Label>
            <Input
              id="custom-filename"
              placeholder={t("backup.customFilenamePlaceholder")}
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              disabled={backingUp}
              className="bg-[#141210] border-[#2b2926] text-white font-mono text-xs focus:border-[#55f289] focus:ring-1 focus:ring-[#55f289] rounded"
            />
          </div>

          {backupResult && (
            <div className={`p-3 rounded text-xs font-mono border ${
              backupResult.success 
                ? "bg-[#132219] border-[#1b3f2a] text-[#55f289]" 
                : "bg-[#2d1210] border-[#4b1b1a] text-[#f25c55]"
            }`}>
              {backupResult.message}
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-[#2b2926] flex gap-3">
            <Button
              disabled={backingUp}
              variant="outline"
              onClick={() => { setBackupOpen(false); setSelectedDb(null); }}
              className="border-[#2b2926] text-[#E6E4DD] hover:bg-[#1c1a17] text-xs font-mono cursor-pointer rounded"
            >
              {t("common.cancel")}
            </Button>
            <Button
              disabled={backingUp || loadingSize}
              onClick={handleStartBackup}
              className="bg-[#1b3224] hover:bg-[#223f2d] text-white border border-[#2b4c37] text-xs font-mono cursor-pointer rounded"
            >
              {backingUp ? (
                <span className="flex items-center gap-1">
                  <IconLoader2 size={12} className="animate-spin" />
                  {t("common.loading")}
                </span>
              ) : (
                "Yedeklemeyi Başlat"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG 2: Delete Database Confirmation */}
      <Dialog open={deleteDbOpen} onOpenChange={setDeleteDbOpen}>
        <DialogContent className="max-w-[450px] sm:max-w-[450px] w-full bg-[#0d0c0b] text-[#E6E4DD] border border-[#2b2926] rounded-md shadow-2xl p-6 font-sans">
          <DialogHeader className="pb-3 border-b border-[#2b2926]">
            <DialogTitle className="text-sm font-mono tracking-wider uppercase text-white flex items-center gap-2">
              <IconAlertCircle size={16} className="text-[#f25c55]" />
              Veritabanını Sil?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#a09e96] pt-1 leading-relaxed">
              Bu işlem geri alınamaz. <strong>{dbToDelete?.name}</strong> veritabanı bağlantısı kalıcı olarak silinecektir.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 flex gap-3">
            <Button
              disabled={deletingDb}
              variant="outline"
              onClick={() => { setDeleteDbOpen(false); setDbToDelete(null); }}
              className="border-[#2b2926] text-[#E6E4DD] hover:bg-[#1c1a17] text-xs font-mono cursor-pointer rounded"
            >
              {t("common.cancel")}
            </Button>
            <Button
              disabled={deletingDb}
              onClick={handleDeleteDb}
              className="bg-[#2d1210] hover:bg-[#4b1b1a] text-white border border-[#4b1b1a] text-xs font-mono cursor-pointer rounded"
            >
              {deletingDb ? t("common.loading") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG 3: Delete Backup Confirmation */}
      <Dialog open={deleteBackupOpen} onOpenChange={setDeleteBackupOpen}>
        <DialogContent className="max-w-[450px] sm:max-w-[450px] w-full bg-[#0d0c0b] text-[#E6E4DD] border border-[#2b2926] rounded-md shadow-2xl p-6 font-sans">
          <DialogHeader className="pb-3 border-b border-[#2b2926]">
            <DialogTitle className="text-sm font-mono tracking-wider uppercase text-white flex items-center gap-2">
              <IconAlertCircle size={16} className="text-[#f25c55]" />
              Yedek Dosyasını Sil?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#a09e96] pt-1 leading-relaxed">
              Bu işlem geri alınamaz. <strong>{backupToDelete?.filename}</strong> yedek dosyası diskten tamamen silinecektir.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 flex gap-3">
            <Button
              disabled={deletingBackup}
              variant="outline"
              onClick={() => { setDeleteBackupOpen(false); setBackupToDelete(null); }}
              className="border-[#2b2926] text-[#E6E4DD] hover:bg-[#1c1a17] text-xs font-mono cursor-pointer rounded"
            >
              {t("common.cancel")}
            </Button>
            <Button
              disabled={deletingBackup}
              onClick={handleDeleteBackup}
              className="bg-[#2d1210] hover:bg-[#4b1b1a] text-white border border-[#4b1b1a] text-xs font-mono cursor-pointer rounded"
            >
              {deletingBackup ? t("common.loading") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG 4: Clear Archive Confirmation */}
      <Dialog open={clearArchiveOpen} onOpenChange={setClearArchiveOpen}>
        <DialogContent className="max-w-[450px] sm:max-w-[450px] w-full bg-[#0d0c0b] text-[#E6E4DD] border border-[#2b2926] rounded-md shadow-2xl p-6 font-sans">
          <DialogHeader className="pb-3 border-b border-[#2b2926]">
            <DialogTitle className="text-sm font-mono tracking-wider uppercase text-white flex items-center gap-2">
              <IconAlertCircle size={16} className="text-[#f25c55]" />
              Tüm Arşivi Temizle?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#a09e96] pt-1 leading-relaxed">
              Bu işlem geri alınamaz. <strong>TÜM</strong> yedek dosyaları diskten ve sistem kayıtlarından kalıcı olarak silinecektir.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 flex gap-3">
            <Button
              disabled={clearingArchive}
              variant="outline"
              onClick={() => setClearArchiveOpen(false)}
              className="border-[#2b2926] text-[#E6E4DD] hover:bg-[#1c1a17] text-xs font-mono cursor-pointer rounded"
            >
              {t("common.cancel")}
            </Button>
            <Button
              disabled={clearingArchive}
              onClick={handleClearArchive}
              className="bg-[#2d1210] hover:bg-[#4b1b1a] text-white border border-[#4b1b1a] text-xs font-mono cursor-pointer rounded"
            >
              {clearingArchive ? t("common.loading") : t("common.clear")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
