import React from "react";
import { cookies } from "next/headers";
import { prisma } from "../../lib/db";
import { Locale } from "../../lib/i18n";
import { ArchivePageClient } from "../../components/archive-page-client";

export default async function ArchivePage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value as Locale) || "tr";

  // Fetch all completed/processing/failed backup jobs with database name relation
  const backups = await prisma.backupJob.findMany({
    where: {
      type: "backup",
    },
    include: {
      database: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Fetch databases list for the connection filter
  const databases = await prisma.databaseConnection.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return <ArchivePageClient initialBackups={backups} databases={databases} locale={locale} />;
}
