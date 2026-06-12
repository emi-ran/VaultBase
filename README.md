<div align="center">

# 🗄️ VaultBase

**Self-hosted PostgreSQL yedekleme yöneticisi ve salt okunur veritabanı gezgini**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/Lisans-MIT-green?style=for-the-badge)](LICENSE)

[Özellikler](#-özellikler) · [Hızlı Başlangıç](#-hızlı-başlangıç) · [Docker](#-docker-ile-çalıştırma) · [Yapılandırma](#-yapılandırma) · [Katkıda Bulun](#-katkıda-bulunma)

</div>

---

## 📋 İçindekiler

- [Nedir?](#-nedir)
- [Özellikler](#-özellikler)
- [Ekran Görüntüleri](#-ekran-görüntüleri)
- [Hızlı Başlangıç](#-hızlı-başlangıç)
- [Docker ile Çalıştırma](#-docker-ile-çalıştırma)
- [Yapılandırma](#-yapılandırma)
- [Kullanım](#-kullanım)
- [Proje Yapısı](#-proje-yapısı)
- [Teknoloji Yığını](#-teknoloji-yığını)
- [Yol Haritası](#-yol-haritası)
- [Katkıda Bulunma](#-katkıda-bulunma)
- [Lisans](#-lisans)

---

## 🔍 Nedir?

VaultBase, birden fazla PostgreSQL veritabanını tek bir panelden güvenli şekilde yönetmenizi sağlayan, **tamamen self-hosted** bir yedekleme ve keşif aracıdır.

- 🔐 Tüm veritabanı şifreleri **AES-256-CBC** ile şifrelenerek saklanır
- 📦 Yedekler **gzip sıkıştırılmış** `.sql.gz` formatında yerel diske kaydedilir
- 🔍 Veritabanlarınızı **salt okunur** modda güvenle gezebilirsiniz
- 🌍 Türkçe ve İngilizce **i18n** desteği (genişletilebilir)
- 🐳 **Docker** ile tek komutla çalıştırılabilir

---

## ✨ Özellikler

### Veritabanı Yönetimi
- ✅ URL veya alan bazlı bağlantı ekleme
- ✅ Gerçek zamanlı bağlantı testi
- ✅ Tüm bağlantıları tek butonla test etme
- ✅ Çevrimiçi / Çevrimdışı durum takibi
- ✅ PostgreSQL tür logosu (kart/tablo/explorer başlıklarında)
- ✅ Birden fazla ortam (development, staging, production)

### Yedekleme
- ✅ Manuel yedek alma (onay modalı ile)
- ✅ Yedek öncesi tahmini boyut gösterimi
- ✅ Gzip sıkıştırılmış `.sql.gz` formatı
- ✅ Yedek arşivi listeleme ve indirme
- ✅ Yedek ve arşiv silme (onay modalı ile)
- ✅ Depolama limiti takibi

### Veritabanı Gezgini
- ✅ Tablo listesi görüntüleme
- ✅ Sayfalandırılmış tablo içeriği (salt okunur)
- ✅ SQL injection koruması

### Ayarlar
- ✅ Tüm yapılandırmayı JSON olarak dışa aktar (isteğe bağlı şifre korumalı)
- ✅ JSON'dan yapılandırma içe aktar (sunucular arası taşıma)
- ✅ Şifreli export: kullanıcı şifresiyle AES-256-CBC koruma
- ✅ Sağlık kontrolü aralığı ayarı (15sn / 30sn / 1dk)
- ✅ Otomatik sağlık kontrolü (sayfa açıkken periyodik polling)

### Güvenlik
- ✅ Kullanıcı adı / şifre ile giriş (`.env` tabanlı)
- ✅ HMAC-SHA256 imzalı session cookie (24 saat)
- ✅ Middleware ile route koruması
- ✅ API uç noktalarında 401 koruması
- ✅ Tüm veritabanı şifreleri AES-256-CBC ile şifrelenir

### Genel
- ✅ Dashboard istatistik kartları
- ✅ Son aktiviteler akışı
- ✅ Türkçe / İngilizce dil desteği
- ✅ Karanlık tema
- ✅ Docker + Docker Compose hazır

---

## 🚀 Hızlı Başlangıç

### Gereksinimler

| Araç | Minimum Sürüm |
|---|---|
| Node.js | v20+ |
| pnpm | v8+ |
| PostgreSQL Client (`pg_dump`) | v14+ |

> **Not:** Docker kullanıyorsanız `pg_dump`'ı ayrıca kurmanıza gerek yoktur; image içinde `postgresql-client-18` mevcuttur.

### Kurulum

```bash
# 1. Repoyu klonlayın
git clone https://github.com/kullanici/vaultbase.git
cd vaultbase

# 2. Bağımlılıkları yükleyin
pnpm install

# 3. Ortam değişkenlerini ayarlayın
cp .env.example .env
# .env dosyasını düzenleyin (APP_SECRET en az 32 karakter olmalı)

# 4. SQLite veritabanını oluşturun
pnpm prisma db push

# 5. Geliştirme sunucusunu başlatın
pnpm dev
```

Tarayıcıda açın: **http://localhost:3000**

---

## 🐳 Docker ile Çalıştırma

Uygulamayı Docker Compose ile tek komutla ayağa kaldırabilirsiniz:

```bash
# Başlat
docker compose up -d

# Log takibi
docker compose logs -f app

# Durdur
docker compose down
```

---

## ⚙️ Yapılandırma

`.env` dosyanızı aşağıdaki değişkenlerle yapılandırın:

```env
# SQLite veritabanı yolu (ayarların saklandığı yer)
DATABASE_URL="file:./vaultbase.db"

# AES-256 şifreleme anahtarı — EN AZ 32 karakter olmalı!
APP_SECRET="buraya-cok-gizli-ve-uzun-bir-anahtar-girin-32-karakter"

# Yönetici giriş bilgileri (web arayüzü için)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="guclu-bir-sifre-belirleyin"

# Yedek dosyalarının kaydedileceği dizin (isteğe bağlı)
BACKUP_DIR="./backups"

# Maksimum depolama limiti MB cinsinden (isteğe bağlı, varsayılan: 5120 = 5 GB)
STORAGE_LIMIT_MB=5120
```

> ⚠️ **Güvenlik Uyarısı:** `APP_SECRET` değerini asla kaynak koda veya Git'e commit etmeyin. Şifre değişirse mevcut şifreli kayıtlar çözülemez.

---

## 📖 Kullanım

### Giriş

1. Tarayıcınızda `http://sunucunuz:3000/login` adresine gidin
2. `.env` dosyasında tanımladığınız `ADMIN_USERNAME` ve `ADMIN_PASSWORD` ile giriş yapın
3. Oturum 24 saat boyunca geçerlidir; sidebardaki **Çıkış Yap** butonu ile oturumu sonlandırabilirsiniz

### Veritabanı Ekleme

1. Dashboard'da **"Veritabanı Ekle"** butonuna tıklayın
2. Bağlantıyı iki şekilde tanımlayabilirsiniz:
   - **URL modu:** `postgresql://kullanici:sifre@host:5432/dbname`
   - **Alan modu:** Host, port, kullanıcı ve şifre ayrı ayrı
3. **"Bağlantıyı Test Et"** ile doğrulayın
4. Kaydedin

### Manuel Yedek Alma

1. İstediğiniz veritabanının satırında yedek ikonuna tıklayın
2. Açılan modalda **tahmini boyutu** görün
3. **"Yedeği Başlat"** ile onaylayın
4. Yedek Arşivi bölümünde `.sql.gz` dosyası belirecek

### Ayarları Taşıma

```
Ayarlar → Yapılandırmayı Dışa Aktar → vaultbase_config.json
```

Bu JSON dosyasını başka bir VaultBase instance'ında **"İçe Aktar"** ile yükleyebilirsiniz.
Export sırasında isteğe bağlı bir şifre belirleyebilirsiniz (AES-256-CBC koruma) veya uyarıyı kabul ederek şifresiz dışa aktarabilirsiniz.

---

## 📁 Proje Yapısı

```
.
├── middleware.ts                   # Route koruması (auth)
├── app/
│   ├── actions.ts                  # Tüm Server Actions
│   ├── page.tsx                    # Ana dashboard
│   ├── login/
│   │   └── page.tsx                # Giriş formu
│   ├── archive/page.tsx            # Yedek arşivi
│   ├── databases/page.tsx          # Bağlantı yönetimi
│   ├── databases/[id]/page.tsx     # Salt okunur tablo gezgini
│   ├── jobs/page.tsx               # Yedek işlem geçmişi
│   ├── schedules/page.tsx          # Zamanlama yönetimi
│   ├── settings/page.tsx           # Ayarlar sayfası
│   ├── storage/page.tsx            # Depolama analizi
│   └── api/backups/[id]/route.ts   # Yedek indirme endpoint'i
├── components/
│   ├── archive-page-client.tsx     # Arşiv arayüzü
│   ├── dashboard-tables.tsx        # Dashboard tabloları
│   ├── database-modal.tsx          # Bağlantı ekleme/düzenleme modalı
│   ├── database-type-mark.tsx      # Veritabanı tür logosu
│   ├── databases-page-client.tsx   # Bağlantı listeleme arayüzü
│   ├── i18n-provider.tsx           # Dil context sağlayıcı
│   ├── jobs-page-client.tsx        # İşlem geçmişi arayüzü
│   ├── schedules-page-client.tsx   # Zamanlama arayüzü
│   ├── sidebar.tsx                 # Yan navigasyon
│   ├── storage-page-client.tsx     # Depolama analiz arayüzü
│   ├── theme-provider.tsx          # Tema sağlayıcı
│   └── ui/                         # Shadcn UI bileşenleri
├── lib/
│   ├── auth.ts                     # Session yönetimi (HMAC-SHA256 imzalı cookie)
│   ├── backup-service.ts           # pg_dump çalıştırıcı
│   ├── cron-service.ts             # Zamanlanmış yedek cron yöneticisi
│   ├── db.ts                       # Prisma SQLite istemcisi
│   ├── db-client.ts                # PostgreSQL dinamik bağlantı
│   ├── encryption.ts               # AES-256-CBC şifreleme
│   ├── i18n.ts                     # i18n yardımcıları
│   └── locales/
│       ├── tr.ts                   # Türkçe çeviriler
│       └── en.ts                   # İngilizce çeviriler
├── prisma/
│   └── schema.prisma               # SQLite şeması
├── prisma.config.ts                # Prisma 7 konfigürasyonu
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── AGENTS.md                       # AI ajan rehberi
├── PLAN.md                         # Proje yol haritası
└── STATUS.md                       # Geliştirme durumu
```

---

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji | Neden? |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Server Actions, file routing, SSR |
| **UI** | Shadcn UI + Tailwind CSS v4 | Hızlı, erişilebilir, özelleştirilebilir |
| **İkonlar** | Tabler Icons | Açık kaynak, kapsamlı |
| **Ayar DB** | SQLite + Prisma 7 | Sıfır bağımlılık, taşınabilir |
| **Driver** | Better-SQLite3 | Sync API, Prisma 7 adapter uyumlu |
| **Target DB** | node-postgres (`pg`) | Olgun, geniş destek |
| **Şifreleme** | AES-256-CBC (Node crypto) | Ekstra bağımlılık gerektirmez |
| **Yedekleme** | `pg_dump` (sistem binary) | Native, en güvenilir yöntem |
| **Container** | Docker + Compose | Kolay deployment |

---

## 🗺️ Yol Haritası

| Phase | Özellik | Durum |
|---|---|---|
| **1** | Temel altyapı, yedekleme, dashboard, explorer | ✅ Tamamlandı |
| **2** | Zamanlanmış otomatik yedekler (node-cron) | ✅ Tamamlandı |
| **3** | Bulut depolama (S3 / R2 / GCS / MinIO) | 🔜 Planlandı |
| **4** | Geri yükleme sistemi (pg_restore) | 🔜 Planlandı |
| **5** | MongoDB desteği (mongodump) | 🔜 Planlandı |
| **6** | Kullanıcı yönetimi & 2FA | 🔜 Planlandı |

Detaylar için [PLAN.md](PLAN.md) dosyasına bakın.

---

## 🤝 Katkıda Bulunma

1. Bu repoyu fork'layın
2. Özellik dalı oluşturun: `git checkout -b feature/harika-ozellik`
3. Değişikliklerinizi commit edin: `git commit -m 'feat: harika özellik eklendi'`
4. Dalı push edin: `git push origin feature/harika-ozellik`
5. Pull Request açın

Büyük değişiklikler için önce bir Issue açarak tartışmaya başlayın.

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) altında dağıtılmaktadır.

---

<div align="center">

**VaultBase** — Verilerinizi güvende tutun 🔐

</div>
