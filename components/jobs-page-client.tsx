"use client";

import React, { useState } from "react";
import { useTranslation } from "./i18n-provider";
import { 
  IconFileZip, 
  IconCheck, 
  IconAlertCircle, 
  IconDatabase, 
  IconTrash, 
  IconDownload, 
  IconSearch, 
  IconFilter, 
  IconRefresh, 
  IconTerminal, 
  IconFileText, 
  IconChevronLeft, 
  IconChevronRight,
  IconUpload,
  IconCopy,
} from "@tabler/icons-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { deleteBackupAction, clearAllBackupsAction } from "../app/actions";

interface Database {
  name: string;
}

interface BackupJob {
  id: string;
  databaseId: string;
  database: Database;
  filename: string;
  filepath: string;
  sizeBytes: number;
  status: string; // "success", "failed", "processing"
  errorMessage: string | null;
  triggerType: string; // "manual", "scheduled"
  type: string; // "backup", "restore"
  createdAt: Date;
}

interface JobsPageClientProps {
  initialJobs: BackupJob[];
}

export function JobsPageClient({ initialJobs }: JobsPageClientProps) {
  const { t, locale } = useTranslation();
  const [jobs, setJobs] = useState<BackupJob[]>(initialJobs);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [triggerFilter, setTriggerFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Delete log dialog
  const [deleteLogOpen, setDeleteLogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<BackupJob | null>(null);
  const [deletingLog, setDeletingLog] = useState(false);
  const [deleteLogError, setDeleteLogError] = useState<string | null>(null);

  // Clear all logs dialog
  const [clearLogsOpen, setClearLogsOpen] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [clearLogsError, setClearLogsError] = useState<string | null>(null);

  // Error modal details
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [errorCopied, setErrorCopied] = useState(false);

  // Statistics
  const totalLogs = jobs.length;
  const successLogs = jobs.filter(j => j.status === "success").length;
  const failedLogs = jobs.filter(j => j.status === "failed").length;
  const restoreLogs = jobs.filter(j => j.type === "restore").length;

  const openDeleteLogDialog = (job: BackupJob) => {
    setLogToDelete(job);
    setDeleteLogError(null);
    setDeleteLogOpen(true);
  };

  const handleDeleteLog = async () => {
    if (!logToDelete) return;
    setDeletingLog(true);
    setDeleteLogError(null);
    try {
      const res = await deleteBackupAction(logToDelete.id);
      if (res.success) {
        setDeleteLogOpen(false);
        setLogToDelete(null);
        setJobs(prev => prev.filter(j => j.id !== logToDelete!.id));
      } else {
        setDeleteLogError(res.error || null);
      }
    } catch (err: any) {
      setDeleteLogError(err.message || t("common.error"));
    } finally {
      setDeletingLog(false);
    }
  };

  const openClearLogsDialog = () => {
    setClearLogsError(null);
    setClearLogsOpen(true);
  };

  const handleClearAllLogs = async () => {
    setClearingLogs(true);
    setClearLogsError(null);
    try {
      const res = await clearAllBackupsAction();
      if (res.success) {
        setClearLogsOpen(false);
        setJobs([]);
      } else {
        setClearLogsError(res.error || null);
      }
    } catch (err: any) {
      setClearLogsError(err.message || t("common.error"));
    } finally {
      setClearingLogs(false);
    }
  };

  // Filter logs
  const filteredJobs = jobs.filter(job => {
    const dbName = job.database?.name || "";
    const filename = job.filename || "";
    const matchesSearch = 
      dbName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      filename.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || 
      job.status === statusFilter;
      
    const matchesTrigger = 
      triggerFilter === "all" || 
      job.triggerType === triggerFilter;

    const matchesType = 
      typeFilter === "all" || 
      job.type === typeFilter;

    return matchesSearch && matchesStatus && matchesTrigger && matchesType;
  });

  // Pagination calculations
  const totalPages = Math.max(Math.ceil(filteredJobs.length / pageSize), 1);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedJobs = filteredJobs.slice(startIndex, startIndex + pageSize);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#090807] text-[#E6E4DD] font-sans">
      
      {/* Header */}
      <header className="h-16 border-b border-[#2b2926] px-8 flex items-center justify-between shrink-0 bg-[#0d0c0b]">
        <div className="flex items-center gap-3">
          <IconFileZip size={18} className="text-[#55f289]" />
          <h1 className="text-sm font-mono tracking-wider font-bold text-white uppercase">{t("jobs.title")}</h1>
        </div>

        {jobs.length > 0 && (
          <Button
            onClick={openClearLogsDialog}
            variant="ghost"
            className="border border-[#2b2926] hover:bg-[#2d1210]/30 text-[#a09e96] hover:text-[#f25c55] font-mono text-xs cursor-pointer py-1.5 px-3 h-auto rounded flex items-center gap-2"
          >
            <IconTrash size={14} />
            {t("jobs.clearLogs")}
          </Button>
        )}
      </header>

      {/* Main Container */}
      <div className="p-8 max-w-5xl w-full mx-auto space-y-6 flex-1">
        
        {/* Statistics Widgets */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md font-sans">
            <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
              <span className="text-[10px] font-mono tracking-wider text-[#a09e96] uppercase">{t("jobs.statsTotal")}</span>
              <IconFileText size={16} className="text-[#a09e96]" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-mono font-bold text-white">{totalLogs}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md font-sans border-l-2 border-l-[#55f289]">
            <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
              <span className="text-[10px] font-mono tracking-wider text-[#a09e96] uppercase">{t("jobs.statsSuccess")}</span>
              <IconCheck size={16} className="text-[#55f289]" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-mono font-bold text-[#55f289]">{successLogs}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md font-sans border-l-2 border-l-[#f25c55]/60">
            <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
              <span className="text-[10px] font-mono tracking-wider text-[#a09e96] uppercase">{t("jobs.statsFailed")}</span>
              <IconAlertCircle size={16} className="text-[#f25c55]/60" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-mono font-bold text-[#f25c55]/80">{failedLogs}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md font-sans border-l-2 border-l-[#e6b04e]/60">
            <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
              <span className="text-[10px] font-mono tracking-wider text-[#a09e96] uppercase">{t("jobs.statsRestore")}</span>
              <IconUpload size={16} className="text-[#e6b04e]/60" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-mono font-bold text-[#e6b04e]/80">{restoreLogs}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search box */}
          <div className="flex-1 relative">
            <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#605e58]" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={t("jobs.searchPlaceholder")}
              className="bg-[#0d0c0b] border-[#2b2926] text-xs font-mono text-white rounded pl-9 w-full h-9"
            />
          </div>

          {/* Status filter */}
          <div className="w-full md:w-48">
            <Select 
              value={statusFilter} 
              onValueChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="bg-[#0d0c0b] border-[#2b2926] text-xs text-white font-mono rounded h-9">
                <SelectValue placeholder={t("jobs.filterStatus")} />
              </SelectTrigger>
              <SelectContent className="bg-[#0d0c0b] border-[#2b2926] text-[#E6E4DD]" position="popper">
                <SelectItem value="all" className="hover:bg-[#2b2926] text-xs font-mono">{t("jobs.filterStatus")}</SelectItem>
                <SelectItem value="success" className="hover:bg-[#2b2926] text-xs font-mono text-[#55f289]">{t("jobs.success")}</SelectItem>
                <SelectItem value="failed" className="hover:bg-[#2b2926] text-xs font-mono text-[#f25c55]">{t("jobs.failed")}</SelectItem>
                <SelectItem value="processing" className="hover:bg-[#2b2926] text-xs font-mono text-[#e6b04e]">{t("jobs.processing")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Trigger filter */}
          <div className="w-full md:w-44">
            <Select 
              value={triggerFilter} 
              onValueChange={(val) => {
                setTriggerFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="bg-[#0d0c0b] border-[#2b2926] text-xs text-white font-mono rounded h-9">
                <SelectValue placeholder={t("jobs.filterTrigger")} />
              </SelectTrigger>
              <SelectContent className="bg-[#0d0c0b] border-[#2b2926] text-[#E6E4DD]" position="popper">
                <SelectItem value="all" className="hover:bg-[#2b2926] text-xs font-mono">{t("jobs.filterTrigger")}</SelectItem>
                <SelectItem value="manual" className="hover:bg-[#2b2926] text-xs font-mono">{t("jobs.manual")}</SelectItem>
                <SelectItem value="scheduled" className="hover:bg-[#2b2926] text-xs font-mono">{t("jobs.scheduled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type filter */}
          <div className="w-full md:w-44">
            <Select 
              value={typeFilter} 
              onValueChange={(val) => {
                setTypeFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="bg-[#0d0c0b] border-[#2b2926] text-xs text-white font-mono rounded h-9">
                <SelectValue placeholder={t("jobs.filterType")} />
              </SelectTrigger>
              <SelectContent className="bg-[#0d0c0b] border-[#2b2926] text-[#E6E4DD]" position="popper">
                <SelectItem value="all" className="hover:bg-[#2b2926] text-xs font-mono">{t("jobs.filterType")}</SelectItem>
                <SelectItem value="backup" className="hover:bg-[#2b2926] text-xs font-mono text-[#55f289]">{t("jobs.typeBackup")}</SelectItem>
                <SelectItem value="restore" className="hover:bg-[#2b2926] text-xs font-mono text-[#e6b04e]">{t("jobs.typeRestore")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Logs List Container */}
        <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md font-sans">
          <CardHeader className="p-6 border-b border-[#2b2926] pb-4">
            <CardTitle className="text-sm font-mono tracking-wider text-white uppercase">
              {t("jobs.listTitle")}
            </CardTitle>
            <CardDescription className="text-xs text-[#a09e96] pt-1 leading-relaxed">
              {t("jobs.desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {paginatedJobs.length === 0 ? (
              <div className="p-8 text-center font-mono text-xs text-[#605e58]">
                {t("jobs.noJobs")}
              </div>
            ) : (
              <div className="divide-y divide-[#2b2926]/40">
                {paginatedJobs.map((job) => (
                  <div key={job.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#141210]/40 transition-colors">
                    
                    {/* Log Entry Details */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      
                      {/* Status Indicator Indicator */}
                      <span className="mt-1 shrink-0">
                        {job.status === "success" && (
                          <span className="h-5 w-5 bg-[#1b3224]/30 border border-[#2b4c37] text-[#55f289] rounded-full flex items-center justify-center" title={t("jobs.success")}>
                            <IconCheck size={10} />
                          </span>
                        )}
                        {job.status === "failed" && (
                          <span className="h-5 w-5 bg-[#2d1210]/30 border border-[#4b1b1a] text-[#f25c55] rounded-full flex items-center justify-center" title={t("jobs.failed")}>
                            <IconAlertCircle size={10} />
                          </span>
                        )}
                        {job.status === "processing" && (
                          <span className="h-5 w-5 bg-[#2b2310]/30 border border-[#4c3b1a] text-[#e6b04e] rounded-full flex items-center justify-center animate-spin" title={t("jobs.processing")}>
                            <IconRefresh size={10} />
                          </span>
                        )}
                      </span>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                            <IconDatabase size={12} className="text-[#605e58]" />
                            {job.database?.name || t("jobs.unknownDb")}
                          </span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            job.triggerType === "manual"
                              ? "bg-[#142230]/20 border-[#1c3852] text-[#5cacf2]"
                              : "bg-[#201430]/20 border-[#2f1c4a] text-[#a45cf2]"
                          }`}>
                            {job.triggerType === "manual" ? t("jobs.manual").toUpperCase() : t("jobs.scheduled").toUpperCase()}
                          </span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            job.type === "restore"
                              ? "bg-[#2b2310]/30 border-[#4c3b1a] text-[#e6b04e]"
                              : "bg-[#132219]/30 border-[#1b3f2a] text-[#55f289]"
                          }`}>
                            {job.type === "restore" ? t("jobs.typeRestore").toUpperCase() : t("jobs.typeBackup").toUpperCase()}
                          </span>
                        </div>

                        <div className="text-[10px] font-mono text-[#a09e96] truncate max-w-full" title={job.filename || job.errorMessage || ""}>
                          {job.status === "success" ? (
                            <span>{job.filename} <span className="text-[#605e58]">({formatSize(job.sizeBytes)})</span></span>
                          ) : job.status === "failed" ? (
                            <span className="text-[#f25c55]/80 italic">{job.errorMessage || t("backup.failedMsg")}</span>
                          ) : (
                            <span className="text-[#e6b04e]">{t("jobs.processing")}...</span>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Meta and actions */}
                    <div className="flex items-center justify-between md:justify-end gap-6">
                      
                      {/* Timestamp */}
                      <span className="text-[10px] font-mono text-[#605e58] text-right whitespace-nowrap">
                        {new Date(job.createdAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        {job.status === "success" && (
                          <a
                            href={`/api/backups/${job.id}`}
                            download
                            className="h-8 w-8 rounded border border-[#2b2926] hover:bg-[#141210] text-[#a09e96] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            title={t("backup.download")}
                          >
                            <IconDownload size={14} />
                          </a>
                        )}

                        {job.status === "failed" && job.errorMessage && (
                          <Button
                            variant="ghost"
                            onClick={() => setSelectedError(job.errorMessage)}
                            className="h-8 py-0 px-2.5 border border-[#4b1b1a]/40 hover:bg-[#2d1210]/20 text-[10px] font-mono text-[#f25c55] hover:text-white rounded cursor-pointer flex items-center gap-1"
                          >
                            <IconTerminal size={12} />
                            {t("jobs.viewError")}
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          onClick={() => openDeleteLogDialog(job)}
                          className="h-8 w-8 p-0 border border-transparent hover:border-[#2b2926] hover:bg-[#2d1210]/30 text-[#a09e96] hover:text-[#f25c55] rounded cursor-pointer flex items-center justify-center transition-colors"
                          title={t("common.delete")}
                        >
                          <IconTrash size={14} />
                        </Button>
                      </div>

                    </div>

                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between font-mono text-[10px] text-[#605e58] pt-2">
            <span>
              {t("backup.paginationInfo", {
                start: startIndex + 1,
                end: Math.min(startIndex + pageSize, filteredJobs.length),
                total: filteredJobs.length,
              })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="h-7 w-7 p-0 border-[#2b2926] text-[#E6E4DD] disabled:opacity-30 rounded flex items-center justify-center cursor-pointer"
              >
                <IconChevronLeft size={14} />
              </Button>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="h-7 w-7 p-0 border-[#2b2926] text-[#E6E4DD] disabled:opacity-30 rounded flex items-center justify-center cursor-pointer"
              >
                <IconChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* Delete Log Confirmation Modal */}
      <Dialog open={deleteLogOpen} onOpenChange={(v) => { if (!deletingLog) { setDeleteLogOpen(v); setDeleteLogError(null); } }}>
        <DialogContent className="max-w-112.5 sm:max-w-112.5 w-full bg-[#0d0c0b] border-[#2b2926] text-[#E6E4DD] rounded-md font-sans p-6 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-[#2b2926]">
            <DialogTitle className="text-sm font-mono tracking-wider text-white uppercase flex items-center gap-2">
              <IconAlertCircle size={16} className="text-[#f25c55]" />
              {t("common.delete")?.toUpperCase()}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#a09e96] pt-1">
              {t("jobs.deleteConfirm")}
            </DialogDescription>
          </DialogHeader>

          {logToDelete && (
            <div className="py-4 space-y-2 font-mono text-xs">
              <div className="bg-[#141210] border border-[#2b2926] rounded p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#605e58]">{t("common.database")}:</span>
                  <span className="text-white font-bold">{logToDelete.database.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#605e58]">{t("common.filename")}:</span>
                  <span className="text-white truncate max-w-[200px] text-right">{logToDelete.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#605e58]">{t("common.status")}:</span>
                  <span className={logToDelete.status === "success" ? "text-[#55f289]" : logToDelete.status === "failed" ? "text-[#f25c55]" : "text-[#f2b855]"}>
                    {logToDelete.status === "success" ? t("common.success") : logToDelete.status === "failed" ? t("common.error") : t("common.processingShort")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#605e58]">{t("common.type")}:</span>
                  <span className="text-white">{logToDelete.type === "restore" ? t("restore.title") : t("backup.backupNow")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#605e58]">{t("common.date")}:</span>
                  <span className="text-[#a09e96]">{new Date(logToDelete.createdAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}</span>
                </div>
              </div>
            </div>
          )}

          {deleteLogError && (
            <div className="mb-4 p-3 bg-[#2d1210] border border-[#4b1b1a] rounded text-[11px] font-mono text-[#f25c55]">
              {deleteLogError}
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-[#2b2926] flex flex-row justify-end gap-3">
            <Button
              onClick={() => { setDeleteLogOpen(false); setLogToDelete(null); setDeleteLogError(null); }}
              disabled={deletingLog}
              variant="outline"
              className="border-[#2b2926] text-[#a09e96] hover:text-white font-mono text-xs cursor-pointer rounded px-4 h-9"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleDeleteLog}
              disabled={deletingLog}
              className="bg-[#2d1210] hover:bg-[#4b1b1a] text-[#f25c55] border border-[#4b1b1a] font-mono text-xs cursor-pointer rounded px-4 h-9 flex items-center gap-2"
            >
              {deletingLog ? t("common.loading") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Logs Confirmation Modal */}
      <Dialog open={clearLogsOpen} onOpenChange={(v) => { if (!clearingLogs) { setClearLogsOpen(v); setClearLogsError(null); } }}>
        <DialogContent className="max-w-112.5 sm:max-w-112.5 w-full bg-[#0d0c0b] border-[#2b2926] text-[#E6E4DD] rounded-md font-sans p-6 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-[#2b2926]">
            <DialogTitle className="text-sm font-mono tracking-wider text-white uppercase flex items-center gap-2">
              <IconAlertCircle size={16} className="text-[#f25c55]" />
              {t("jobs.clearLogsTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#a09e96] pt-1">
              {t("jobs.clearLogsConfirm")}
            </DialogDescription>
          </DialogHeader>

          {clearLogsError && (
            <div className="mb-4 p-3 bg-[#2d1210] border border-[#4b1b1a] rounded text-[11px] font-mono text-[#f25c55]">
              {clearLogsError}
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-[#2b2926] flex flex-row justify-end gap-3">
            <Button
              onClick={() => { setClearLogsOpen(false); setClearLogsError(null); }}
              disabled={clearingLogs}
              variant="outline"
              className="border-[#2b2926] text-[#a09e96] hover:text-white font-mono text-xs cursor-pointer rounded px-4 h-9"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleClearAllLogs}
              disabled={clearingLogs}
              className="bg-[#2d1210] hover:bg-[#4b1b1a] text-[#f25c55] border border-[#4b1b1a] font-mono text-xs cursor-pointer rounded px-4 h-9 flex items-center gap-2"
            >
              {clearingLogs ? t("common.loading") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Details Modal */}
      <Dialog open={!!selectedError} onOpenChange={(open) => !open && setSelectedError(null)}>
        <DialogContent className="max-w-150 sm:max-w-150 w-full bg-[#0d0c0b] border-[#2b2926] text-[#E6E4DD] rounded-md font-sans p-6 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-[#2b2926]">
            <DialogTitle className="text-sm font-mono tracking-wider text-white uppercase flex items-center gap-2">
              <IconTerminal size={16} className="text-[#f25c55]" />
              {t("jobs.errorModalTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#a09e96] pt-1">
              {t("jobs.errorModalDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-[#141210] border border-[#2b2926] rounded p-4 overflow-auto max-h-75 relative group">
            <pre className="font-mono text-xs text-[#f25c55] leading-relaxed whitespace-pre-wrap break-all">
              {selectedError}
            </pre>
            <button
              onClick={() => {
                if (selectedError) {
                  navigator.clipboard.writeText(selectedError);
                  setErrorCopied(true);
                  setTimeout(() => setErrorCopied(false), 2000);
                }
              }}
              className="absolute bottom-2 right-2 p-1.5 rounded bg-[#1c1a17] border border-[#2b2926] text-[#a09e96] hover:text-white hover:border-[#55f289] transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
              title="Copy error"
            >
              {errorCopied ? <IconCheck size={14} className="text-[#55f289]" /> : <IconCopy size={14} />}
            </button>
          </div>

          <div className="flex justify-end pt-4 border-t border-[#2b2926]">
            <Button
              onClick={() => setSelectedError(null)}
              className="bg-[#1b3224] hover:bg-[#223f2d] text-white border border-[#2b4c37] font-mono text-xs cursor-pointer rounded px-6 h-9"
            >
              {t("common.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
