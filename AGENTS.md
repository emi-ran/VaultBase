# VaultBase – Agent Rehberi

Bu dosya, yapay zeka (AI) ajanların VaultBase projesinde çalışırken uyması gereken kuralları, mimari kararları ve bağlamı özetler.

---

## Proje Özeti

**VaultBase**, self-hosted bir PostgreSQL veritabanı yedekleme yöneticisi ve salt okunur veritabanı gezginidir.  
Next.js 16 (App Router), Tailwind CSS v4, Shadcn UI, SQLite (Prisma 7 + Better-SQLite3) ve Docker ile inşa edilmiştir.

---

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Frontend | Next.js 16 App Router, React, Tailwind CSS v4 |
| UI Bileşenleri | Shadcn UI (preset: b2CPlgBHs), Tabler Icons |
| Backend | Next.js Server Actions (app/actions.ts) |
| Veritabanı (Ayarlar) | SQLite via Prisma 7 + @prisma/adapter-better-sqlite3 |
| Veritabanı (Hedef) | PostgreSQL via pg paketi |
| Yedekleme | pg_dump (sistem binary), gzip sıkıştırma |
| Şifreleme | AES-256-CBC (lib/encryption.ts) |
| i18n | Türkçe/İngilizce (lib/locales/) |
| Container | Docker + Docker Compose |

---

## Kritik Mimari Kurallar

### Prisma 7 Kuralları (ZORUNLU)
- Bağlantı URL'si schema.prisma içinde YAZILMAZ; yalnızca prisma.config.ts içinde tanımlanır.
- Client başlatırken mutlaka driver adapter geçilmeli: new PrismaBetterSqlite3({ url: ... }).
- prisma generate sonrası PrismaBetterSqlite3 import yolu: @prisma/adapter-better-sqlite3.

### Server Actions
- Tüm form ve tetikleyici işlemler app/actions.ts içindedir.
- Backup işlemi lib/backup-service.ts içindeki runBackup() fonksiyonundan geçer.
- Veritabanı bağlantı testleri lib/db-client.ts içindeki testConnection() ile yapılır.

### Hata Yönetimi
- pg_dump bulunamazsa (ENOENT) gerçek hatayı kullanıcıya ilet; "başarılı gibi davran" YASAK.
- Yedek başarısızlığı veritabanını otomatik "Çevrimdışı" yapmamalı. Bağlantı durumu ayrıca kontrol edilmeli.
- spawn hatalarında hasErrorOccurred flag ile error + close çift tetiklemesi önlenmeli.

### i18n
- Sunucu tarafı: getT(locale) fonksiyonunu kullan.
- İstemci tarafı: useTranslation() hookunu kullan.
- Tüm çeviriler lib/locales/tr.ts ve lib/locales/en.ts içindedir.

### UI / Responsive
- Modal genişlikleri: max-w-[600px] sm:max-w-[600px] — Shadcn default sm:max-w-sm sınırını geçersiz kılmak için açıkça belirtilmeli.
- Select dropdown hizalaması: popper (item-aligned değil).

### Güvenlik
- Tüm veritabanı şifreleri AES-256-CBC ile APP_SECRET env değişkeni kullanılarak şifrelenir.
- Ayarlar export/import sırasında şifreler şifreli biçimde taşınır.
- SQL injection koruması: lib/db-client.ts içinde identifier validation mevcut.

---

## Dosya Haritası

```
db-backuper/
├── app/
│   ├── actions.ts                  # Tüm Server Actions
│   ├── page.tsx                    # Ana dashboard (Genel Bakış)
│   ├── archive/
│   │   └── page.tsx                # Yedek arşivi yönetim sayfası (Arama, filtreleme, indirme, silme)
│   ├── databases/
│   │   ├── page.tsx                # Bağlantı yönetim sayfası (Arama, filtreleme, test, vb.)
│   │   └── [id]/page.tsx           # Salt okunur tablo gezgini
│   ├── settings/page.tsx           # Ayarlar (export/import)
│   ├── storage/page.tsx            # Depolama durum & analiz sayfası
│   └── api/backups/[id]/route.ts   # Yedek dosyası indirme endpoint
├── components/
│   ├── dashboard-tables.tsx        # Dashboard veritabanı ve yedek listesi
│   ├── databases-page-client.tsx   # Bağlantı listeleme ve yönetim arayüzü
│   ├── archive-page-client.tsx     # Yedek arşivi listeleme ve filtreleme arayüzü
│   ├── storage-page-client.tsx     # Depolama durum & analiz arayüzü
│   ├── database-modal.tsx          # Bağlantı ekleme & düzenleme modalı
│   ├── i18n-provider.tsx           # İstemci tarafı dil contexti
│   └── ui/                         # Shadcn UI bileşenleri
├── lib/
│   ├── backup-service.ts           # pg_dump spawn executor
│   ├── db.ts                       # Prisma client (SQLite)
│   ├── db-client.ts                # PostgreSQL dinamik bağlantı
│   ├── encryption.ts               # AES-256-CBC şifreleme
│   ├── i18n.ts                     # i18n yardımcıları
│   └── locales/
│       ├── tr.ts                   # Türkçe çeviriler
│       └── en.ts                   # İngilizce çeviriler
├── prisma/
│   └── schema.prisma               # SQLite şeması
├── prisma.config.ts                # Prisma 7 konfigürasyonu
├── scripts/
│   └── test-core.ts                # Şifreleme ve Ayarlar export/import test senaryoları
├── Dockerfile                      # postgresql-client-18 içerir
├── docker-compose.yml              # Docker Compose konfigürasyonu
├── .env.example                    # Örnek ortam değişkenleri
├── AGENTS.md                       # Bu dosya
├── PLAN.md                         # Proje plan ve roadmap
└── STATUS.md                       # Güncel geliştirme durumu
```

---

## Ortam Değişkenleri

| Değişken | Açıklama | Zorunlu |
|---|---|---|
| DATABASE_URL | SQLite dosya yolu (file:./vaultbase.db) | Evet |
| APP_SECRET | AES şifreleme anahtarı (min 32 karakter) | Evet |
| BACKUP_DIR | Yedek dosyalarının kaydedileceği dizin | Hayır (varsayılan: ./backups) |
| STORAGE_LIMIT_MB | Maksimum depolama limiti (MB) | Hayır (varsayılan: 5120) |

---

## Geliştirme Komutları

```bash
pnpm install        # Bağımlılıkları yükle
pnpm dev            # Geliştirme sunucusu (port 3000)
pnpm build          # Production build
pnpm prisma db push # Veritabanı şemasını uygula
pnpm prisma studio  # Prisma Studio ile SQLite görüntüle
```

## Docker

```bash
docker compose up -d          # Uygulamayı başlat
docker compose down           # Durdur
docker compose logs -f app    # Log takibi
```

Test veritabanı: postgresql://vaultuser:vaultpass@localhost:5432/vaulttest

---

## Commit Öncesi Zorunlu Kontroller

Her commit öncesinde aşağıdaki kontrollerin tamamlanması **ZORUNLUDUR**. Herhangi bir adım başarısız olursa commit atılmaz ve sorun önce giderilir.

### 1. TypeScript + Production Build Kontrolü
```bash
pnpm build
```
- TypeScript derleme hataları sıfır olmalı.
- Tüm route'lar (pages) listede görünmeli.

### 2. Güvenlik Açığı Taraması
```bash
pnpm audit
```
- `No known vulnerabilities found` çıktısı beklenir.
- Kritik veya yüksek seviyeli zafiyet varsa `pnpm audit --fix` ile kapatılır; kapanmazsa manuel olarak override/patch uygulanır.

### 3. Docker Build Kontrolü
```bash
docker compose build
```
- Build hatasız tamamlanmalı.
- Tüm stage'ler (base, deps, builder, runner) başarılı olmalı.

### 4. Docker Çalışma Testi
```bash
docker compose up -d
docker compose logs app --tail=40
```
- Konteyner crash olmadan ayağa kalkmalı.
- `✓ Ready in` satırı görünmeli (Next.js başarılı başlatma).
- `Prisma migration` adımı hatasız tamamlanmalı.

### 5. Dokümantasyon Güncelliği
Commit öncesinde aşağıdaki dosyaların içeriği aktüel durumu yansıtıyor olmalı:

| Dosya | Kontrol Edilecek Alan |
|---|---|
| `AGENTS.md` | Dosya haritası, mimari kurallar, commit kontrolleri |
| `PLAN.md` | Tamamlanan görevler `[x]` işaretli olmalı |
| `STATUS.md` | Çalışan özellikler tablosu, son commit bilgisi |

### Hızlı Kontrol Komutu (Sıralı)
```bash
pnpm build
pnpm audit
docker compose build
```
Her biri başarılıysa commit güvenlidir.
