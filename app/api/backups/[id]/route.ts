import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "../../../../lib/db";
import { verifySession } from "../../../../lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token || !(await verifySession(token))) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const job = await prisma.backupJob.findUnique({
      where: { id },
    });

    if (!job) {
      return new NextResponse("Backup not found", { status: 404 });
    }

    if (!fs.existsSync(job.filepath)) {
      return new NextResponse("Backup file not found on disk", { status: 404 });
    }

    // Read the file and stream it
    const fileStream = fs.createReadStream(job.filepath);
    const fileName = path.basename(job.filepath);

    // Create a readable stream response
    // Next.js Response accepts ReadableStream or Web Stream. We can convert Node.js stream or pass it as any
    const response = new NextResponse(fileStream as any, {
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "application/gzip",
      },
    });

    return response;
  } catch (error: any) {
    console.error("Download failed:", error);
    return new NextResponse(error.message || "Failed to download backup", { status: 500 });
  }
}
