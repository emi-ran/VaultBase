"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { 
  IconServer, 
  IconDatabase, 
  IconFileZip, 
  IconExternalLink,
  IconInfoCircle,
  IconShieldCheck,
  IconAlertTriangle,
  IconAlertOctagon,
  IconArrowRight
} from "@tabler/icons-react";
import { useTranslation } from "./i18n-provider";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "./ui/table";

// Format bytes helper
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

interface StoragePageClientProps {
  databases: any[];
  backups: any[];
  maxStorageBytes: number;
  limitMb: number;
  backupDir: string;
  locale: string;
}

export function StoragePageClient({ 
  databases, 
  backups, 
  maxStorageBytes, 
  limitMb, 
  backupDir 
}: StoragePageClientProps) {
  const { t } = useTranslation();

  // Computations
  const totalUsedBytes = useMemo(() => {
    return backups.reduce((sum, b) => sum + (b.sizeBytes || 0), 0);
  }, [backups]);

  const totalAvailableBytes = useMemo(() => {
    return Math.max(0, maxStorageBytes - totalUsedBytes);
  }, [maxStorageBytes, totalUsedBytes]);

  const utilizationPercent = useMemo(() => {
    return Math.min(Math.round((totalUsedBytes / maxStorageBytes) * 100), 100);
  }, [totalUsedBytes, maxStorageBytes]);

  // Determine status
  const statusInfo = useMemo(() => {
    if (utilizationPercent >= 95) {
      return {
        label: t("storagePage.critical"),
        color: "bg-[#2d1210] border-[#4b1d1a] text-[#f25c55]",
        icon: IconAlertOctagon,
        textColor: "text-[#f25c55]"
      };
    } else if (utilizationPercent >= 80) {
      return {
        label: t("storagePage.warning"),
        color: "bg-[#2d2410] border-[#4b3c1a] text-[#f2b855]",
        icon: IconAlertTriangle,
        textColor: "text-[#f2b855]"
      };
    } else {
      return {
        label: t("storagePage.normal"),
        color: "bg-[#1b3224]/30 border-[#2b4c37] text-[#55f289]",
        icon: IconShieldCheck,
        textColor: "text-[#55f289]"
      };
    }
  }, [utilizationPercent, t]);

  const StatusIcon = statusInfo.icon;

  // DB Breakdown data
  const databaseBreakdown = useMemo(() => {
    return databases.map((db) => {
      const dbBackups = db.backups || [];
      const dbTotalBytes = dbBackups.reduce((sum: number, b: any) => sum + (b.sizeBytes || 0), 0);
      const dbAvgBytes = dbBackups.length > 0 ? dbTotalBytes / dbBackups.length : 0;
      const shareOfTotal = totalUsedBytes > 0 ? (dbTotalBytes / totalUsedBytes) * 100 : 0;

      return {
        id: db.id,
        name: db.name,
        host: db.host,
        port: db.port,
        databaseName: db.database,
        backupCount: dbBackups.length,
        totalBytes: dbTotalBytes,
        avgBytes: dbAvgBytes,
        share: shareOfTotal,
      };
    }).sort((a, b) => b.totalBytes - a.totalBytes);
  }, [databases, totalUsedBytes]);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto font-sans bg-[#090807] text-[#E6E4DD]">
      {/* Header */}
      <header className="h-16 border-b border-[#2b2926] px-8 flex items-center justify-between shrink-0 bg-[#0d0c0b]">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-mono tracking-wider font-bold text-white uppercase">
            {t("navigation.storage")}
          </h2>
          <span className="text-[10px] font-mono text-[#605e58] border border-[#2b2926] px-2 py-0.5 rounded uppercase">
            {utilizationPercent}% {t("storagePage.used").toLowerCase()}
          </span>
        </div>
      </header>

      {/* Main Grid Content */}
      <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Used Storage */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("storagePage.used")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-mono font-bold text-white">
                  {formatBytes(totalUsedBytes)}
                </span>
                <span className="text-[10px] font-mono text-[#605e58]">
                  ({utilizationPercent}%)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Available Space */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("storagePage.available")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-mono font-bold text-[#55f289]">
                  {formatBytes(totalAvailableBytes)}
                </span>
                <span className="text-[10px] font-mono text-[#605e58]">
                  ({100 - utilizationPercent}%)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Storage Limit */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("storagePage.limit")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-mono font-bold text-white">
                  {formatBytes(maxStorageBytes)}
                </span>
                <span className="text-[9px] font-mono text-[#605e58] uppercase">
                  {limitMb} MB
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Status */}
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-[10px] font-mono text-[#605e58] tracking-wider uppercase">
                {t("storagePage.status")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center gap-2 mt-1.5">
                <StatusIcon size={16} className={statusInfo.textColor} />
                <Badge variant="outline" className={`text-[9px] font-mono border ${statusInfo.color}`}>
                  {statusInfo.label.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visual Progress Bar Card */}
        <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md p-6 space-y-4">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-[#a09e96] flex items-center gap-1.5">
              <IconServer size={14} className="text-[#605e58]" />
              {t("stats.storageUsage")}
            </span>
            <span className="text-white font-bold">{utilizationPercent}%</span>
          </div>

          <div className="space-y-2">
            <Progress value={utilizationPercent} className="h-3 bg-[#141210] border border-[#2b2926]" />
            
            {/* Percentage markers */}
            <div className="flex justify-between text-[9px] font-mono text-[#605e58] pt-1 px-1">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </Card>

        {/* Database Contribution Table */}
        <div className="bg-[#0d0c0b] border border-[#2b2926] rounded-md overflow-hidden">
          <div className="p-6 border-b border-[#2b2926] flex flex-row items-center justify-between">
            <h3 className="text-xs font-mono font-bold tracking-wider text-white uppercase flex items-center gap-2">
              <IconDatabase size={14} className="text-[#55f289]" />
              {t("storagePage.databaseBreakdown")}
            </h3>
          </div>
          <div>
            {databaseBreakdown.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-[#605e58]">
                {t("database.noDbs")}
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#141210] border-b border-[#2b2926]">
                  <TableRow className="border-b border-[#2b2926] hover:bg-[#141210]">
                    <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase px-6">
                      {t("database.shortName")}
                    </TableHead>
                    <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase">
                      {t("database.connAddress")}
                    </TableHead>
                    <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase">
                      {t("storagePage.backupCount")}
                    </TableHead>
                    <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase">
                      {t("storagePage.avgSize")}
                    </TableHead>
                    <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase">
                      {t("storagePage.percentTotal")}
                    </TableHead>
                    <TableHead className="text-[10px] font-mono tracking-wider text-[#605e58] uppercase text-right px-6">
                      {t("storagePage.used")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {databaseBreakdown.map((item) => (
                    <TableRow key={item.id} className="border-b border-[#2b2926]/40 hover:bg-[#141210]/40">
                      
                      {/* Short Name & Db Name */}
                      <TableCell className="font-mono font-bold text-xs text-white px-6">
                        <div className="flex flex-col">
                          <span>{item.name}</span>
                          <span className="text-[9px] text-[#605e58] font-normal">{item.databaseName}</span>
                        </div>
                      </TableCell>

                      {/* Connection Host:Port */}
                      <TableCell className="font-mono text-xs text-[#a09e96]">
                        {item.host}:{item.port}
                      </TableCell>

                      {/* Backup Count */}
                      <TableCell className="font-mono text-xs text-[#a09e96]">
                        <div className="flex items-center gap-1.5">
                          <IconFileZip size={12} className="text-[#605e58]" />
                          <span>{item.backupCount}</span>
                        </div>
                      </TableCell>

                      {/* Average Size */}
                      <TableCell className="font-mono text-xs text-[#a09e96]">
                        {formatBytes(item.avgBytes)}
                      </TableCell>

                      {/* Percent share */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={item.share} className="h-1.5 w-16 bg-[#141210]" />
                          <span className="font-mono text-[10px] text-[#a09e96]">{Math.round(item.share)}%</span>
                        </div>
                      </TableCell>

                      {/* Total footprint size */}
                      <TableCell className="font-mono font-bold text-xs text-[#55f289] text-right px-6">
                        {formatBytes(item.totalBytes)}
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Configuration and info card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md md:col-span-2 p-6 space-y-4">
            <h4 className="text-xs font-mono font-bold tracking-wider text-white uppercase flex items-center gap-2">
              <IconInfoCircle size={14} className="text-[#a09e96]" />
              {t("storagePage.configurationTitle")}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="space-y-1">
                <span className="text-[#605e58] text-[10px] block uppercase">
                  {t("storagePage.backupDir")}
                </span>
                <span className="text-white break-all">{backupDir}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[#605e58] text-[10px] block uppercase">
                  {t("storagePage.compression")}
                </span>
                <span className="text-[#55f289]">
                  {t("storagePage.compressionDesc")}
                </span>
              </div>

              <div className="space-y-1 md:col-span-2 border-t border-[#2b2926]/40 pt-3">
                <span className="text-[#605e58] text-[10px] block uppercase">
                  {t("storagePage.envLimit")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{limitMb} MB</span>
                  <span className="text-[10px] text-[#605e58]">(~ {formatBytes(maxStorageBytes, 0)})</span>
                </div>
                <p className="text-[10px] text-[#605e58] pt-1">
                  {t("storagePage.limitNote")}
                </p>
              </div>
            </div>
          </Card>

          {/* Quick link card */}
          <Card className="bg-[#1b3224]/10 border border-[#2b4c37]/50 rounded-md p-6 flex flex-col justify-between">
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold tracking-wider text-[#55f289] uppercase">
                {t("storagePage.manageTitle")}
              </h4>
              <p className="text-xs text-[#a09e96] leading-relaxed">
                {t("storagePage.manageDesc")}
              </p>
            </div>
            
            <Link href="/archive" className="mt-4">
              <Button className="w-full bg-[#1b3224] hover:bg-[#203c2b] text-[#55f289] border border-[#2b4c37] rounded font-mono text-xs h-9 cursor-pointer flex items-center justify-between px-4">
                <span>{t("storagePage.cleanupLink")}</span>
                <IconArrowRight size={14} />
              </Button>
            </Link>
          </Card>
        </div>

      </div>
    </div>
  );
}
