# VaultBase – Geliştirme Durumu

Son güncelleme: 13 Haziran 2026

---

## Anlık Durum

**Aktif Sürüm:** 1.0.0  
**Genel Durum:** ✅ Kararlı (Geliştirme & Production Ortamı)  
**Aktif Phase:** Phase 5 (MongoDB Desteği) – TAMAMLANDI

---

## Phase 1 & 2 Tamamlama Özeti

Phase 1-5 özellikleri eksiksiz tamamlandı, test edildi ve kararlı hale getirildi.  
Aşağıdaki tüm özellikler çalışır durumda:

### Çalışan Özellikler

| Özellik | Durum | Not |
|---|---|---|
| Veritabanı ekleme | ✅ Çalışıyor | URL ve alan bazlı mod |
| Bağlantı testi | ✅ Çalışıyor | Gerçek pg bağlantısı |
| Veritabanı listeleme | ✅ Çalışıyor | Durum kartları ile |
| /databases Sayfası | ✅ Çalışıyor | Arama, filtreleme (ortam/etiket) ve tüm yönetim işlemleri (test, yedek, düzenle, sil) |
| /archive Sayfası | ✅ Çalışıyor | Arama, veritabanı/durum/tetikleyici filtreleri, depolama istatistikleri, indirme, silme ve toplu temizleme |
| /storage Sayfası | ✅ Çalışıyor | Toplam kullanılan alan, kullanılabilir alan, limit kartları, görsel kapasite barı ve veritabanı bazlı depolama analizi |
| Zamanlanmış Yedekler | ✅ Çalışıyor | `node-cron` entegrasyonu ile arka planda çalışır |
| /schedules Sayfası | ✅ Çalışıyor | Zamanlanmış oto-yedek kuralları arama, listeleme, düzenleme, silme, aktif/pasif etme |
| Basit ve Gelişmiş Zamanlama | ✅ Çalışıyor | Basit (Her gün, haftanın günleri, ayın günü) ve Gelişmiş (Özel cron girişi, gün gün ayrı saat belirleme) |
| Sistem Saati Göstergesi | ✅ Çalışıyor | Sidebar'da yerel/GMT ticking clock |
| Zaman Dilimi Seçimi | ✅ Çalışıyor | Ayarlar sayfasından IANA zaman dilimi ayarı (GMT+3 vs. otomatik DST hesabı ile) |
| Manuel yedek alma | ✅ Çalışıyor | pg_dump gerektirir (özel isimlendirme destekli) |
| Yedek arşivi | ✅ Çalışıyor | .sql.gz formatı |
| Yedek indirme | ✅ Çalışıyor | API route |
| Yedek silme | ✅ Çalışıyor | Onay modalı ile |
| Arşivi temizle | ✅ Çalışıyor | Toplu silme, onay modalı |
| Arşivden Geri Yükleme | ✅ Çalışıyor | Archive sayfasından yedek seç + hedef DB seç + Shadcn Dialog onay akışı |
| Restore İşlem Logları | ✅ Çalışıyor | BackupJob.type alanı, jobs sayfasında RESTORE badge + type filtre |
| Tablo gezgini | ✅ Çalışıyor | Salt okunur, sayfalandırılmış |
| Ayarlar export (şifreli) | ✅ Çalışıyor | Kullanıcı şifresiyle AES-256 şifreleme, modal üzerinden |
| Ayarlar export (şifresiz) | ✅ Çalışıyor | Düz metin JSON (uyarı ile) |
| Ayarlar import (şifreli dosya) | ✅ Çalışıyor | Modal ile şifre sorulur, hatalı şifrede uyarı |
| Test senaryoları | ✅ Çalışıyor | Şifreleme ve Ayarlar export/import testleri (scripts/test-core.ts) |
| Türkçe arayüz | ✅ Çalışıyor | i18n altyapısı hazır |
| Docker paketi | ✅ Çalışıyor | postgresql-client-18 dahil |
| Onay modalleri | ✅ Çalışıyor | Yedek al, sil, temizle |
| Depolama göstergesi | ✅ Çalışıyor | Limit takibi |
| /jobs Sayfası | ✅ Çalışıyor | Yedek işlem geçmişi listeleme, durum/tetikleyici filtreleri, hata modalı |
| PostgreSQL Tür Logosu | ✅ Çalışıyor | Kart/tablo/explorer başlıklarında PostgreSQL logosu |
| MongoDB Tür Logosu | ✅ Çalışıyor | DatabaseTypeMark bileşeni, yeşil SVG logo |
| MongoDB Bağlantı & Test | ✅ Çalışıyor | mongodb driver ile URI parsing, ping, auth source/SSL/TLS |
| MongoDB Explorer | ✅ Çalışıyor | Collection listesi + döküman tablosu (dinamik kolonlar, sayfalama) |
| MongoDB Yedekleme | ✅ Çalışıyor | mongodump --archive | gzip, type routing ile |
| MongoDB Geri Yükleme | ✅ Çalışıyor | gunzip | mongorestore --archive --drop |
| Veritabanı Tür Seçici | ✅ Çalışıyor | Modal'da PostgreSQL/MongoDB toggle, otomatik port/placeholder değişimi |
| Otomatik Tür Algılama | ✅ Çalışıyor | mongodb:// prefix → MongoDB routing |
| Tüm Bağlantıları Test Et | ✅ Çalışıyor | /databases sayfasında tek butonla tüm bağlantıları test etme |
| Otomatik Sağlık Kontrolü | ✅ Çalışıyor | Ayarlardan 15sn/30sn/1dk aralıkla otomatik polling, sayfa açıkken çalışır |
| Kullanıcı Girişi | ✅ Çalışıyor | .env tabanlı admin (ADMIN_USERNAME/PASSWORD), HMAC-imzalı session cookie, proxy.ts ile route koruması |
| Çıkış Yap | ✅ Çalışıyor | Cookie temizleme ve /login'e yönlendirme |
| API Auth Koruması | ✅ Çalışıyor | Backup download & restore API 401 döndürür |
| Geri Yükleme (Restore) | ✅ Çalışıyor | Streaming gunzip → psql, schema override, Shadcn Dialog onay akışı |
| Explorer Sayfalama Optimizasyonu | ✅ Çalışıyor | pg_class.reltuples COUNT, 25/50/100 page size seçici |

---

## Sürüm Notları

### v1.0.0 — MongoDB Desteği, i18n Polisajı

- MongoDB bağlantı: lib/db-mongo-client.ts (ping, collections, documents, size)
- MongoDB yedekleme: lib/backup-mongo-service.ts (mongodump --archive | gzip)
- MongoDB geri yükleme: lib/restore-mongo-service.ts (gunzip | mongorestore --archive --drop)
- database-modal.tsx: PostgreSQL/MongoDB type toggle, otomatik port/placeholder
- database-type-mark.tsx: MongoDB SVG logo
- app/databases/[id]/page.tsx: MongoDB collection/document explorer (dinamik kolonlar)
- actions.ts: type-aware CRUD, parseMongoUrl, test/backup/restore routing by type
- backup-service.ts: type routing (postgresql → pg_dump, mongodb → mongodump)
- components tür göstergesi (dashboard-tables, databases-page-client)
- Dockerfile: mongodb-database-tools (Ubuntu MongoDB 8.0 apt repo)
- esbuild güvenlik fix (CVE override → ^0.28.1)
- i18n polisajı: 200+ sabit string temizliği, translate() interpolasyon, schedules Dialog migration

### v1.1.0 — Geri Yükleme, Proxy Migration, Performans İyileştirmeleri

- Geri yükleme (restore): streaming gunzip → psql, DROP SCHEMA CASCADE pre-step
- API route: `POST /api/restore?databaseId=X` (streaming body, session auth)
- /databases sayfasında Import butonu + Shadcn Dialog onay akışı
- middleware.ts → proxy.ts taşıma (Turbopack NFT uyarısı azaldı)
- Explorer sayfalama optimizasyonu: pg_class.reltuples, pageSize 25→50, 25/50/100 seçici
- Jobs sayfası: browser confirm/alert → Shadcn Dialog (tutarlı UX)
- Jobs sayfası: locale desteği eklendi (rowsPerPage anahtarı)
- pg_dump --if-exists bayrağı (DROP TABLE IF EXISTS)
- Arşiv sayfasından doğrudan geri yükleme (yedek seç + hedef DB seç + Shadcn Dialog)
- Restore işlem logları: BackupJob.type alanı, jobs sayfasında type badge + filtre

### v1.0.0 — Kullanıcı Girişi Eklendi

- Kullanıcı adı/şifre ile giriş (.env tabanlı)
- HMAC-SHA256 imzalı session cookie (24 saat geçerlilik)
- proxy.ts ile tüm route koruması (API'lerde 401, sayfalarda /login yönlendirmesi)
- Giriş yapmış kullanıcıyı /login'den /'ye yönlendirme
- Sidebar'da çıkış butonu

---

## Bilinen Sorunlar

### Çözülmüş
- **[ÇÖZÜLDÜ]** pg_dump bulunamazsa (ENOENT) veritabanını Çevrimdışı olarak yanlış işaretleme
  - Düzeltme: backup-service.ts'de hasErrorOccurred flag + ayrı bağlantı testi
- **[ÇÖZÜLDÜ]** Yedek al modalındaki form alanllarının sıkışık görünmesi
  - Düzeltme: max-w-[600px] override + popper hizalaması
- **[ÇÖZÜLDÜ]** Spawn error + close çift tetiklenme hatası
  - Düzeltme: hasErrorOccurred boolean flag
- **[ÇÖZÜLDÜ]** node-cron tipi ve scheduled: true seçeneğinin kaldırılması
  - Düzeltme: node-cron v4 standardına uyarlandı, ScheduledTask tipi doğrudan import edildi.
- **[ÇÖZÜLDÜ]** Test scriptindeki .ts uzantılı importların Next build'ı engellemesi
  - Düzeltme: scripts/test-core.ts importlarındaki uzantılar kaldırıldı.
- **[ÇÖZÜLDÜ]** Docker pnpm esbuild scriptinin çalışmasının engellenmesi
  - Düzeltme: package.json'a pnpm onlyBuiltDependencies tanımlandı.
- **[ÇÖZÜLDÜ]** Büyük tablolarda explorer COUNT(*) yavaşlığı
  - Düzeltme: pg_class.reltuples ile yaklaşık COUNT (10k+ satır), sayfa boyutu 25→50, 25/50/100 seçici
- **[ÇÖZÜLDÜ]** Eski yedeklerde (--if-exists olmadan) restore başarısızlığı
  - Düzeltme: backup-service.ts'ye --if-exists eklendi, restore pipe'ında ON_ERROR_STOP=1 kaldırıldı
- **[ÇÖZÜLDÜ]** Arşiv sayfasından doğrudan geri yükleme
  - Düzeltme: archive-page-client.tsx restore butonu + hedef DB seçici + Shadcn Dialog + restoreFromArchiveAction

### Açık
- pg_dump Windows'ta PATH'de yoksa hata mesajı bazen belirsiz olabiliyor

### Çözüldü
- **[ÇÖZÜLDÜ]** testAndUpdateDatabaseStatusAction yalnızca PostgreSQL test ediyordu
  - Düzeltme: db.type kontrolü eklendi, MongoDB için testMongoConnection'a yönlendirir
- **[ÇÖZÜLDÜ]** testAllConnectionsAction yalnızca PostgreSQL test ediyordu
  - Düzeltme: db.type kontrolü eklendi, MongoDB için testMongoConnection'a yönlendirir

---

## Bağımlılıklar

```json
{
  "next": "16.2.9",
  "react": "19.x",
  "prisma": "7.x",
  "@prisma/adapter-better-sqlite3": "7.x",
  "better-sqlite3": "latest",
  "pg": "latest",
  "mongodb": "7.3.0",
  "tailwindcss": "4.x",
  "@tabler/icons-react": "latest"
}
```

---

## Ortam Gereksinimleri

| Gereksinim | Minimum | Önerilen |
|---|---|---|
| Node.js | v20 | v22 LTS |
| pnpm | v8 | v9 |
| pg_dump | 14+ | 18 (Docker ile gelir) |
| mongodump / mongorestore | 7.0+ | 8.0 (Docker ile gelir) |
| Disk (yedekler) | 1 GB | 10+ GB |

---

## Sonraki Adımlar (Phase 3 & 6)

Öncelik sırasına göre:

1. **Bulut depolama entegrasyonu** — Amazon S3, Cloudflare R2, Google Cloud Storage, MinIO entegrasyonları
2. **Otomatik bulut senkronizasyonu** — yedek tamamlandığında otomatik olarak bulut depolamaya kopyalanması
3. **Bulut yedekleri yönetimi** — bulut üzerindeki yedek dosyalarını arama, indirme ve silme arayüzleri
4. **Çok kullanıcılı erişim yönetimi** — 2FA, roller (Admin / Viewer)

---

## Git Durumu

```
Branch: master
Son Commit: 8258c56 — chore: merge remote changes, keep larger sidebar icon and original icon.svg
Durum: Unstaged değişiklikler — README.md ve README.tr.md dosyalarına Windows PowerShell için docker run komutu uyumluluğu/notu eklenmesi
```

---

## Hızlı Başlangıç

```bash
# Yerel geliştirme
cp .env.example .env
pnpm install
pnpm prisma db push
pnpm dev

# Docker ile
docker compose up -d
# Tarayıcı: http://localhost:3000
```
