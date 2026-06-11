import React from "react";
import { cookies } from "next/headers";
import { prisma } from "../../lib/db";
import { Locale } from "../../lib/i18n";
import { DatabasesPageClient } from "../../components/databases-page-client";

export default async function DatabasesPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value as Locale) || "tr";

  // Fetch all databases with backups and schedules relation
  const databases = await prisma.databaseConnection.findMany({
    include: {
      backups: true,
      schedules: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return <DatabasesPageClient databases={databases} />;
}
