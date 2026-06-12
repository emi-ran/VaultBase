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
- **ZORUNLU:** Onay gerektiren işlemlerde asla tarayıcının `confirm()` / `alert()` fonksiyonlarını kullanma. Bunun yerine projedeki mevcut Shadcn UI Dialog pattern'ini kullan (bkz. components/dashboard-tables.tsx, components/databases-page-client.tsx). Pattern: `{action}Open` state + `{item}ToDelete` state + `{actioning}` loading state + `<Dialog>` + `<DialogContent>` + `<DialogHeader>` + `<DialogFooter>`. Herhangi bir yeni onay modalı eklemeden ÖNCE mutlaka projedeki mevcut örnekleri incele ve aynı pattern'i uygula.

### Güvenlik
- Tüm veritabanı şifreleri AES-256-CBC ile APP_SECRET env değişkeni kullanılarak şifrelenir.
- Ayarlar export: isteğe bağlı kullanıcı şifresiyle PBKDF2+AES-256 veya düz metin (uyarı ile). Import'ta şifreli dosyalar için modal ile şifre sorulur.
- SQL injection koruması: lib/db-client.ts içinde identifier validation mevcut.

---

## Dosya Haritası

```
.
├── app/
│   ├── actions.ts                  # Tüm Server Actions
│   ├── page.tsx                    # Ana dashboard (Genel Bakış)
│   ├── login/
│   │   └── page.tsx                # Giriş formu (client component)
│   ├── archive/
│   │   └── page.tsx                # Yedek arşivi yönetim sayfası
│   ├── databases/
│   │   ├── page.tsx                # Bağlantı yönetim sayfası
│   │   └── [id]/page.tsx           # Salt okunur tablo gezgini
│   ├── jobs/page.tsx               # Yedek işlem geçmişi sayfası
│   ├── schedules/page.tsx          # Zamanlama yönetim sayfası
│   ├── settings/page.tsx           # Ayarlar (export/import)
│   ├── storage/page.tsx            # Depolama durum & analiz sayfası
│   └── api/backups/[id]/route.ts   # Yedek dosyası indirme endpoint
├── components/
│   ├── archive-page-client.tsx     # Arşiv arayüzü
│   ├── dashboard-tables.tsx        # Dashboard veritabanı ve yedek listesi
│   ├── database-modal.tsx          # Bağlantı ekleme & düzenleme modalı
│   ├── database-type-mark.tsx      # Veritabanı tür logosu
│   ├── databases-page-client.tsx   # Bağlantı listeleme arayüzü
│   ├── i18n-provider.tsx           # İstemci tarafı dil contexti
│   ├── jobs-page-client.tsx        # İşlem geçmişi arayüzü
│   ├── schedules-page-client.tsx   # Zamanlama arayüzü
│   ├── sidebar.tsx                 # Yan navigasyon
│   ├── storage-page-client.tsx     # Depolama analiz arayüzü
│   ├── theme-provider.tsx          # Tema sağlayıcı
│   └── ui/                         # Shadcn UI bileşenleri
├── lib/
│   ├── auth.ts                     # Session yönetimi (HMAC-SHA256 imzalı cookie)
│   ├── backup-service.ts           # pg_dump spawn executor
│   ├── cron-service.ts             # Zamanlanmış yedek cron yöneticisi
│   ├── db.ts                       # Prisma client (SQLite)
│   ├── db-client.ts                # PostgreSQL dinamik bağlantı
│   ├── encryption.ts               # AES-256-CBC şifreleme
│   ├── i18n.ts                     # i18n yardımcıları
│   └── locales/
│       ├── tr.ts                   # Türkçe çeviriler
│       └── en.ts                   # İngilizce çeviriler
├── proxy.ts                        # Route koruması (auth kontrolü + yönlendirme)
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
| ADMIN_USERNAME | Web arayüzü yönetici kullanıcı adı | Evet |
| ADMIN_PASSWORD | Web arayüzü yönetici şifresi | Evet |
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

### 3. Dokümantasyon Güncelliği
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
```
Her biri başarılıysa commit güvenlidir.
