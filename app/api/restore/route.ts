import { NextRequest, NextResponse } from "next/server"
import { Readable } from "stream"
import { prisma } from "../../../lib/db"
import { decrypt } from "../../../lib/encryption"
import { verifySession } from "../../../lib/auth"
import { runRestore } from "../../../lib/restore-service"

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value
    if (!token || !(await verifySession(token))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const databaseId = request.nextUrl.searchParams.get("databaseId")
    if (!databaseId) {
      return NextResponse.json({ error: "databaseId query parameter is required" }, { status: 400 })
    }

    const db = await prisma.databaseConnection.findUnique({ where: { id: databaseId } })
    if (!db) {
      return NextResponse.json({ error: "Database connection not found" }, { status: 404 })
    }

    const contentType = request.headers.get("content-type") || ""
    if (!contentType.includes("gzip") && !contentType.includes("octet-stream") && !contentType.includes("*/*")) {
      return NextResponse.json({ error: "Expected application/gzip content type" }, { status: 400 })
    }

    const decryptedPassword = decrypt(db.password)
    if (!request.body) {
      return NextResponse.json({ error: "Request body is empty" }, { status: 400 })
    }

    const nodeStream = Readable.fromWeb(request.body as any)

    const result = await runRestore(nodeStream, {
      host: db.host,
      port: db.port,
      user: db.user,
      password: decryptedPassword,
      database: db.database,
    })

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Restore API error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Restore failed" },
      { status: 500 }
    )
  }
}
