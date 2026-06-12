<div align="center">

# 🗄️ VaultBase

**Sleek, self-hosted PostgreSQL backup manager & read-only database explorer.**

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

VaultBase is a lightweight, fully self-hosted dashboard that allows you to manage backups, execute restores, and explore multiple PostgreSQL databases from a single modern interface. It handles background cron schedules, displays real-time connection health, and isolates access through custom credentials.

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

### 🔍 Read-only Explorer
* **Database Navigator**: List tables, examine schemas, and view pageable table rows in a clean, modern UI.
* **Database Brand Badging**: Instant brand visualization for quick recognition.

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

> [!NOTE]
> If you run VaultBase via Docker, `pg_dump` is pre-bundled (PostgreSQL client version 18), so you do not need to install it locally.

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

The simplest way to run VaultBase is with Docker Compose:

```bash
# Copy and configure environment variables
cp .env.example .env

# Spin up the container in detached mode
docker compose up -d

# Watch container logs
docker compose logs -f app

# Tear down the container
docker compose down
```

SQLite databases and backup dumps will be persisted inside local volumes pointing to `/app/data` and `/app/backups`.

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

## 📁 Directory Structure

```
.
├── proxy.ts                        # Route protection middleware
├── instrumentation.ts              # Next.js instrumentation (launches cron schedules)
├── app/
│   ├── actions.ts                  # Backend Server Actions
│   ├── page.tsx                    # Dashboard (Overview)
│   ├── login/                      # Login page client-side form
│   ├── archive/                    # Backups archive table
│   ├── databases/                  # Database connections & Explorer
│   ├── jobs/                       # Job logs & history
│   ├── schedules/                  # Automated cron schedule manager
│   ├── settings/                   # Configuration export/import
│   ├── storage/                    # Disk space analyzer
│   └── api/                        # Backup download and restore SSE routes
├── components/
│   ├── ui/                         # Shadcn UI reusable components
│   └── *.tsx                       # Feature-specific client pages
├── lib/
│   ├── auth.ts                     # Session cookies manager (HMAC-SHA256)
│   ├── backup-service.ts           # Spawns pg_dump instances
│   ├── cron-service.ts             # Manages node-cron intervals
│   ├── db.ts                       # SQLite Prisma connection client
│   ├── db-client.ts                # Direct PostgreSQL connection pooler
│   ├── encryption.ts               # AES-256-CBC crypto helper
│   ├── i18n.ts                     # Localization helpers
│   └── locales/                    # English (en) & Turkish (tr) translations
├── prisma/                         # Database schema configuration
├── scripts/                        # Development test runner scripts
└── Dockerfile                      # Bundles Next.js along with postgresql-client-18
```

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
