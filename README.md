<div align="center">

# 🗄️ VaultBase

**Sleek, self-hosted PostgreSQL & MongoDB backup manager and read-only database explorer.**

[![TR / Türkçe](https://img.shields.io/badge/Language-TR%20%2F%20T%C3%BCrk%C3%A7e-blue?style=flat-square)](README.tr.md)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Features](#-key-features) · [Quick Start](#-quick-start) · [Docker Setup](#-docker-deployment) · [Configuration](#-configuration) · [Screenshots](#-visual-walkthrough)

</div>

---

## 🔍 Overview

VaultBase is a lightweight, fully self-hosted dashboard that allows you to manage backups, execute restores, and explore multiple PostgreSQL and MongoDB databases from a single modern interface. It handles background cron schedules, displays real-time connection health, and isolates access through custom credentials.

---

## ✨ Key Features

### 🔑 Security First
* **AES-256-CBC Encryption**: All target database connection strings and credentials are encrypted at rest using your custom `APP_SECRET` key.
* **Route Protection**: Fully protected routes using custom HMAC-SHA256 session cookies.
* **Safe SQL Queries**: DB exploration executes under strict read-only constraints with full SQL injection prevention.

### 📦 Backup & Recovery
* **Manual Backups**: Run instant database dumps with one click, showing estimated size before starting.
* **Automated Schedules**: Set up per-database `node-cron` schedules directly from the UI.
* **Gzip Compression**: All backups are securely stored as space-efficient `.sql.gz` files.
* **Streaming Restores**: Gunzip-and-restore pipeline that handles target DB recovery via clean drops and recreation with real-time UI logging.
* **PostgreSQL**: `pg_dump` with `--clean --if-exists` for clean backup and restore.
* **MongoDB**: `mongodump` / `mongorestore` with `--gzip --archive --drop` for consistent snapshots.
* **Type Routing**: Automatic detection of database type from connection URL prefix (`postgresql://` vs `mongodb://`).

### 🔍 Read-only Explorer
* **Database Navigator**: List tables/collections, examine schemas/documents, and view pageable data in a clean, modern UI.
* **PostgreSQL Explorer**: Browse tables, paginate rows, safe read-only queries with SQL injection prevention.
* **MongoDB Explorer**: Browse collections across all databases in the instance, view documents with dynamic column flattening, pagination.
* **Database Type Badging**: Instant brand visualization (PostgreSQL blue / MongoDB green) for quick recognition.

### ⚙️ Portability & Settings
* **Configuration Sync**: Export/import settings as JSON files. You can encrypt your configurations with a password for secure backups.
* **Polling Status Checker**: Auto-check database status periodically (15s / 30s / 1m).

---

## 📸 Visual Walkthrough

### 1. Main Dashboard Overview
Monitor overall stats, connection status of databases, storage consumption limits, and recent activity logs.
![Main Dashboard](assets/main_dashboard.png)

### 2. Connection Manager
Manage multiple database connections and environments (Development, Staging, Production) with real-time health checks.
![Connection Manager](assets/databases_page.png)

### 3. Read-Only Database Explorer
Safely browse, filter, and paginate through your database table records without accidental write-operations.
![Database Explorer](assets/db_explorer.png)

### 4. Interactive Backup & Restores
Start manual backups showing estimated size or manage scheduled jobs, restoring easily with custom confirmations.
![Backup Modal](assets/backup_modal.png)

---

## 🚀 Quick Start

### Prerequisites

| Component | Minimum Version |
|---|---|
| Node.js | v20+ |
| pnpm | v8+ |
| PostgreSQL Client (`pg_dump`) | v14+ |
| MongoDB Tools (`mongodump`, `mongorestore`) | v7.0+ |

> [!NOTE]
> If you run VaultBase via Docker, `pg_dump` (PostgreSQL client 18) and `mongodump`/`mongorestore` (MongoDB Database Tools 8.0) are pre-bundled.

### Local Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/vaultbase.git
cd vaultbase

# 2. Install dependencies
pnpm install

# 3. Setup environment variables
cp .env.example .env
# Edit .env file and set a secure APP_SECRET (min 32 characters)

# 4. Generate & Push SQLite settings database
pnpm prisma db push

# 5. Run development server
pnpm dev
```

Open your browser at: **http://localhost:3000**

---

## 🐳 Docker Deployment

The simplest way to run VaultBase is with the prebuilt Docker image:

```bash
docker pull 3mirun/vaultbase:latest
```

Create a `.env` file from the example before starting the container:

```bash
cp .env.example .env
```

Edit the required values in `.env`:

```env
# Required: use a strong, random value. Keep it stable after first setup.
APP_SECRET=replace-with-a-secure-random-secret-key-at-least-32-chars

# Required: web UI administrator credentials.
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-strong-password

# Optional
PORT=3000
STORAGE_LIMIT_MB=5120
```

Then start VaultBase with Docker Compose:

```bash
# Spin up the container in detached mode
docker compose up -d

# Watch container logs
docker compose logs -f app

# Tear down the container
docker compose down
```

SQLite databases and backup dumps will be persisted inside local volumes pointing to `/app/data` and `/app/backups`.

If you run the image manually instead of Docker Compose, pass the same required environment variables and mount persistent volumes.

**Linux / macOS / Git Bash:**
```bash
docker run -d \
  --name vaultbase \
  -p 3000:3000 \
  -e APP_SECRET="replace-with-a-secure-random-secret-key-at-least-32-chars" \
  -e ADMIN_USERNAME="admin" \
  -e ADMIN_PASSWORD="replace-with-a-strong-password" \
  -e DATABASE_URL="file:/app/data/dev.db" \
  -e BACKUP_DIR="/app/backups" \
  -e STORAGE_LIMIT_MB="5120" \
  -v vaultbase-data:/app/data \
  -v vaultbase-backups:/app/backups \
  3mirun/vaultbase:latest
```

**Windows PowerShell:**
```powershell
docker run -d `
  --name vaultbase `
  -p 3000:3000 `
  -e APP_SECRET="replace-with-a-secure-random-secret-key-at-least-32-chars" `
  -e ADMIN_USERNAME="admin" `
  -e ADMIN_PASSWORD="replace-with-a-strong-password" `
  -e DATABASE_URL="file:/app/data/dev.db" `
  -e BACKUP_DIR="/app/backups" `
  -e STORAGE_LIMIT_MB="5120" `
  -v vaultbase-data:/app/data `
  -v vaultbase-backups:/app/backups `
  3mirun/vaultbase:latest
```

---

## ⚙️ Configuration

Configure VaultBase using your `.env` file:

| Environment Variable | Description | Required | Default / Example |
|---|---|---|---|
| `DATABASE_URL` | SQLite database connection string for settings | Yes | `file:./vaultbase.db` |
| `APP_SECRET` | 32+ character key for AES encryption | Yes | *Your secure random secret* |
| `ADMIN_USERNAME`| Web UI Administrator Username | Yes | `admin` |
| `ADMIN_PASSWORD`| Web UI Administrator Password | Yes | *Your secure password* |
| `BACKUP_DIR` | Directory where backups are written | No | `./backups` |
| `STORAGE_LIMIT_MB`| Maximum local storage quota (in Megabytes) | No | `5120` (5 GB) |

> [!WARNING]
> Keep `APP_SECRET` secure. If you lose or change this key, all stored database passwords will become unrecoverable.

---

## 🤝 Contributing

Contributions are welcome! Please check out the steps below:

1. Fork the project repository.
2. Create your feature branch: `git checkout -b feature/cool-new-feature`
3. Commit your changes: `git commit -m 'feat: add support for S3 buckets'`
4. Push to the branch: `git push origin feature/cool-new-feature`
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">

**VaultBase** — Secure your database peace of mind 🔐

</div>
