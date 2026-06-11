import React from "react";
import { prisma } from "../../lib/db";
import { SchedulesPageClient } from "../../components/schedules-page-client";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const databases = await prisma.databaseConnection.findMany({
    orderBy: { name: "asc" },
  });

  const schedules = await prisma.schedule.findMany({
    include: { database: true },
    orderBy: { createdAt: "desc" },
  });

  const timezoneSetting = await prisma.setting.findUnique({
    where: { key: "timezone" },
  });
  const timezone = timezoneSetting?.value || "Europe/Istanbul";

  return (
    <SchedulesPageClient
      initialDatabases={databases}
      initialSchedules={schedules}
      timezone={timezone}
    />
  );
}
