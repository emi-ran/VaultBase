import React from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { prisma, DatabaseConnection, BackupJob } from "../lib/db";
import { getT, Locale } from "../lib/i18n";
import { DatabaseModal } from "../components/database-modal";
import { 
  IconCircleFilled, 
  IconActivity, 
  IconDatabase,
  IconDownload,
  IconTrash,
  IconRefresh,
  IconAlertCircle,
  IconExternalLink
} from "@tabler/icons-react";
import { triggerBackupAction, deleteDatabaseAction, deleteBackupAction, clearAllBackupsAction } from "./actions";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

// Format bytes helper
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value as Locale) || "tr";
  const t = getT(locale);

  // Fetch data from SQLite
  const databases = await prisma.databaseConnection.findMany({
    orderBy: { createdAt: "desc" },
  });

  const backups = await prisma.backupJob.findMany({
    orderBy: { createdAt: "desc" },
    include: { database: true },
  });

  const schedules = await prisma.schedule.findMany({
    where: { enabled: true },
  });

  // Calculate statistics
  const dbCount = databases.length;
  const offlineDbs = databases.filter((db: DatabaseConnection) => db.status === "offline");
  const isHealthy = offlineDbs.length === 0 && dbCount > 0;
  
  const successBackups = backups.filter((b: BackupJob) => b.status === "success");
  const lastBackup = successBackups.length > 0 ? successBackups[0] : null;
  const totalBytes = successBackups.reduce((sum: number, b: BackupJob) => sum + b.sizeBytes, 0);

  // Storage calculation (based on a default 5GB mock limit for MVP display)
  const maxStorage = 5 * 1024 * 1024 * 1024; // 5 GB
  const storagePercent = Math.min(Math.round((totalBytes / maxStorage) * 100), 100);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto font-sans bg-[#090807] text-[#E6E4DD]">
      {/* Top Header */}
      <header className="h-16 border-b border-[#2b2926] px-8 flex items-center justify-between shrink-0 bg-[#0d0c0b]">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-mono tracking-wider font-bold text-white uppercase">{t("common.recentActivities").split(" ")[1] || "Genel bakış"}</h2>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1b3224]/30 border border-[#2b4c37] text-[10px] font-mono text-[#55f289]">
            <IconCircleFilled size={6} className="animate-pulse" />
            {t("common.workerActive").toUpperCase()}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DatabaseModal />
        </div>
      </header>

      {/* Main Grid Content */}
      <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Stat 1: System Health */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("stats.systemStatus")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center gap-2 mt-1">
                <IconCircleFilled size={10} className={dbCount === 0 ? "text-[#a09e96]" : isHealthy ? "text-[#55f289]" : "text-[#f25c55]"} />
                <span className="text-sm font-mono font-bold text-white">
                  {dbCount === 0 ? t("common.untested").toUpperCase() : isHealthy ? t("common.healthy").toUpperCase() : t("common.offline").toUpperCase()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Stat 2: Connected DB */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("stats.connectedDb")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-xl font-mono font-bold text-white block mt-0.5">{dbCount}</span>
            </CardContent>
          </Card>

          {/* Stat 3: Last Backup */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md col-span-1 md:col-span-1 lg:col-span-1">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("stats.lastSuccessBackup")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-xs font-mono text-[#a09e96] block truncate mt-1">
                {lastBackup ? lastBackup.filename.split("_backup_")[0] : "-"}
              </span>
            </CardContent>
          </Card>

          {/* Stat 4: Total Stored */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("stats.totalStored")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-xl font-mono font-bold text-white block mt-0.5">
                {formatBytes(totalBytes)}
              </span>
            </CardContent>
          </Card>

          {/* Stat 5: Schedules */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("stats.nextSchedule")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-sm font-mono font-bold text-[#E6E4DD] block mt-1">
                {schedules.length > 0 ? `${schedules.length} ${t("common.active").toUpperCase()}` : "-"}
              </span>
            </CardContent>
          </Card>

          {/* Stat 6: Storage Usage */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("stats.storageUsage")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-1">
              <div className="flex justify-between items-center text-[10px] font-mono text-white mt-1">
                <span>{storagePercent}%</span>
                <span className="text-[#605e58]">{formatBytes(maxStorage, 0)} Limit</span>
              </div>
              <Progress value={storagePercent} className="h-1.5 bg-[#1c1a17]" />
            </CardContent>
          </Card>
        </div>

        {/* Needs Attention Alert Block */}
        {offlineDbs.length > 0 && (
          <div className="flex items-center gap-3 p-4 bg-[#2d1210] border border-[#4b1b1a] rounded text-xs font-mono text-[#f25c55]">
            <IconAlertCircle size={18} className="shrink-0 animate-bounce" />
            <div>
              <span className="font-bold">{t("common.attentionRequired")}: </span>
              {offlineDbs.map((db: DatabaseConnection) => db.name).join(", ")} veritabanlarına şu an erişilemiyor. Lütfen bağlantıları kontrol edin.
            </div>
          </div>
        )}

        {/* Primary Sections Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Side: Databases & Archive (2 cols wide) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Database Status Card */}
            <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md">
              <CardHeader className="p-6 border-b border-[#2b2926] flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                  {t("database.status")}
                </CardTitle>
                <DatabaseModal />
              </CardHeader>
              <CardContent className="p-0">
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
                      {databases.map((db: DatabaseConnection) => (
                        <TableRow key={db.id} className="border-b border-[#2b2926]/40 hover:bg-[#141210]/40">
                          <TableCell className="font-mono font-bold text-xs text-white px-6">
                            <div className="flex flex-col">
                              <span>{db.name}</span>
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
                              <IconCircleFilled size={8} className={
                                db.status === "healthy" ? "text-[#55f289]" : db.status === "offline" ? "text-[#f25c55]" : "text-[#a09e96]"
                              } />
                              {db.status === "healthy" ? t("common.healthy") : db.status === "offline" ? t("common.offline") : t("common.untested")}
                            </span>
                          </TableCell>
                          <TableCell className="text-right px-6 space-x-2">
                            <Link href={`/databases/${db.id}`}>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-[#a09e96] hover:text-white hover:bg-[#1c1a17] rounded cursor-pointer" title="Gezgin">
                                <IconExternalLink size={14} />
                              </Button>
                            </Link>
                            
                            <form action={async () => {
                              "use server";
                              await triggerBackupAction(db.id);
                            }} className="inline-block">
                              <Button type="submit" size="icon" variant="ghost" className="h-7 w-7 text-[#55f289] hover:bg-[#1b3224]/30 rounded cursor-pointer" title={t("backup.backupNow")}>
                                <IconRefresh size={14} />
                              </Button>
                            </form>

                            <form action={async () => {
                              "use server";
                              await deleteDatabaseAction(db.id);
                            }} className="inline-block">
                              <Button type="submit" size="icon" variant="ghost" className="h-7 w-7 text-[#f25c55] hover:bg-[#2d1210]/30 rounded cursor-pointer" title={t("common.delete")}>
                                <IconTrash size={14} />
                              </Button>
                            </form>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Backup Archive Card */}
            <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md">
              <CardHeader className="p-6 border-b border-[#2b2926] flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                  {t("backup.archive")}
                </CardTitle>
                {backups.length > 0 && (
                  <form action={async () => {
                    "use server";
                    await clearAllBackupsAction();
                  }}>
                    <Button type="submit" variant="outline" className="border-[#2b2926] hover:bg-[#2d1210]/20 hover:text-[#f25c55] hover:border-[#f25c55]/30 text-[10px] font-mono h-7 px-3 rounded cursor-pointer">
                      {t("common.clear").toUpperCase()}
                    </Button>
                  </form>
                )}
              </CardHeader>
              <CardContent className="p-0">
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
                      {backups.map((job: any) => (
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
                            
                            <form action={async () => {
                              "use server";
                              await deleteBackupAction(job.id);
                            }} className="inline-block">
                              <Button type="submit" size="icon" variant="ghost" className="h-7 w-7 text-[#f25c55] hover:bg-[#2d1210]/30 rounded cursor-pointer" title={t("common.delete")}>
                                <IconTrash size={14} />
                              </Button>
                            </form>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Right Side: Activity Log Feed */}
          <div className="space-y-6">
            <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md h-full min-h-[400px]">
              <CardHeader className="p-6 border-b border-[#2b2926] flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                  {t("common.recentActivities")}
                </CardTitle>
                <Button variant="ghost" className="text-[9px] text-[#605e58] hover:text-white font-mono h-6 px-2 rounded cursor-pointer">
                  {t("common.seeAll")}
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {backups.length === 0 ? (
                  <div className="text-center py-16 text-xs font-mono text-[#605e58]">
                    {t("common.noActivities")}
                  </div>
                ) : (
                  <div className="space-y-4 font-mono text-xs">
                    {backups.slice(0, 10).map((act: any) => (
                      <div key={act.id} className="flex gap-3 border-b border-[#2b2926]/30 pb-3 last:border-0 last:pb-0">
                        <div className="mt-0.5">
                          <IconActivity size={14} className={
                            act.status === "success" ? "text-[#55f289]" : act.status === "failed" ? "text-[#f25c55]" : "text-[#f2b855]"
                          } />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-[#E6E4DD]">
                            <span className="font-bold text-white">{act.database?.name || "Veritabanı"}</span> yedeği{" "}
                            {act.status === "success" ? "başarıyla tamamlandı." : act.status === "failed" ? "başarısız oldu." : "işleme alındı."}
                          </p>
                          <div className="flex justify-between text-[10px] text-[#605e58]">
                            <span>{act.filename.substring(0, 24)}...</span>
                            <span>{new Date(act.createdAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
}
