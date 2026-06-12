import React from "react";
import { cookies } from "next/headers";
import { prisma } from "../../lib/db";
import { Locale } from "../../lib/i18n";
import { getBackupDirectory } from "../../lib/backup-service";
import { StoragePageClient } from "../../components/storage-page-client";

export default async function StoragePage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value as Locale) || "tr";

  // Fetch all databases with backups count
  const databases = await prisma.databaseConnection.findMany({
    include: {
      backups: {
        where: {
          status: "success",
          type: "backup",
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Fetch all successful backups to compute sizes
  const backups = await prisma.backupJob.findMany({
    where: {
      status: "success",
      type: "backup",
    },
    include: {
      database: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Get backup storage limit (default 5120 MB / 5 GB)
  const limitMb = Number(process.env.STORAGE_LIMIT_MB) || 5120;
  const maxStorageBytes = limitMb * 1024 * 1024;

  // Get current backup directory path
  const backupDir = getBackupDirectory();

  return (
    <StoragePageClient
      databases={databases}
      backups={backups}
      maxStorageBytes={maxStorageBytes}
      limitMb={limitMb}
      backupDir={backupDir}
      locale={locale}
    />
  );
}
