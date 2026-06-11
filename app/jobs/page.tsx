import React from "react";
import { prisma } from "../../lib/db";
import { JobsPageClient } from "../../components/jobs-page-client";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await prisma.backupJob.findMany({
    include: { database: true },
    orderBy: { createdAt: "desc" },
  });

  return <JobsPageClient initialJobs={jobs} />;
}
