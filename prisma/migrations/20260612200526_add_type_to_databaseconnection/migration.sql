-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DatabaseConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'postgresql',
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "user" TEXT NOT NULL,
    "database" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "ssl" TEXT NOT NULL DEFAULT 'prefer',
    "environment" TEXT NOT NULL DEFAULT 'production',
    "labels" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'untested',
    "lastTestedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DatabaseConnection" ("createdAt", "database", "environment", "host", "id", "labels", "lastTestedAt", "name", "password", "port", "ssl", "status", "updatedAt", "user") SELECT "createdAt", "database", "environment", "host", "id", "labels", "lastTestedAt", "name", "password", "port", "ssl", "status", "updatedAt", "user" FROM "DatabaseConnection";
DROP TABLE "DatabaseConnection";
ALTER TABLE "new_DatabaseConnection" RENAME TO "DatabaseConnection";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
