# VaultBase – Proje Planı

Bu dosya, VaultBase projesinin tüm geliştirme aşamalarını, tamamlananları ve gelecek planlarını içerir.

---

## Vizyon

VaultBase; birden fazla PostgreSQL (ilerleyen sürümlerde MongoDB) veritabanını tek bir panelden yönetmenizi, düzenli otomatik yedekler almanızı, yedekleri bulut depolamaya (S3/R2/GCS) yüklemenizi ve veritabanlarınızı salt okunur modda gezmenizi sağlayan self-hosted bir çözümdür.

---

## Phase 1 – Temel Altyapı (TAMAMLANDI)

### 1.1 Proje İskeleti
- [x] Next.js 16 + Tailwind CSS v4 kurulumu
- [x] Shadcn UI kurulumu (preset: b2CPlgBHs)
- [x] Prisma 7 + Better-SQLite3 entegrasyonu
- [x] AES-256-CBC şifreleme katmanı (lib/encryption.ts)
- [x] i18n altyapısı (Türkçe/İngilizce)

### 1.2 Veritabanı Yönetimi
- [x] Veritabanı ekleme modalı (URL veya alan bazlı)
- [x] Dinamik bağlantı testi (testConnectionAction)
- [x] Veritabanı listeleme ve durum gösterimi
- [x] Çevrimiçi/Çevrimdışı durum takibi
- [x] Veritabanı silme (onay modalı ile)
- [x] /databases yönetim sayfası (arama, ortam/etiket filtreleme, test et, yedek al, düzenle, sil aksiyonları)

### 1.3 Yedekleme Sistemi
- [x] Manuel yedek alma (pg_dump spawn executor) ve özel isimlendirme
- [x] Gzip sıkıştırma (.sql.gz formatı)
- [x] Yedek arşivi listeleme
- [x] Yedek indirme endpoint'i (API route)
- [x] Yedek silme (onay modalı ile)
- [x] Arşivi temizle butonu (toplu silme, onay modalı ile)
- [x] Depolama limiti takibi
- [x] pg_dump bulunamadığında gerçek hata gösterimi (simülasyon YOK)

### 1.4 Dashboard
- [x] İstatistik kartları (Sistem Durumu, Bağlı DB, Son Yedek, Toplam Depolama, Sıradaki Zamanlama, Depolama Kullanımı)
- [x] Uyarı banner'ı (erişilemeyen veritabanları için)
- [x] Son Aktiviteler akışı
- [x] Yedek al butonu: onay modalı + tahmini boyut gösterimi
- [x] Veritabanı durumu gerçek zamanlı güncelleme

### 1.5 Salt Okunur Explorer
- [x] Veritabanı tablo listesi (app/databases/[id]/page.tsx)
- [x] Sayfalandırılmış tablo içeriği görüntüleme
- [x] SQL injection koruması

### 1.6 Ayarlar
- [x] Ayarları JSON olarak dışa aktar (Export)
- [x] Ayarları JSON'dan içe aktar (Import)
- [x] Şifreli veritabanı bilgileri de export/import ile taşınır

### 1.7 Docker & DevOps
- [x] Dockerfile (postgresql-client-18 dahil)
- [x] docker-compose.yml (App + test Postgres sidecar)
- [x] .env.example
- [x] .gitignore / .dockerignore
- [x] İlk Git commit'i

---

## Phase 2 – Zamanlanmış Yedekler (TAMAMLANDI)

### 2.1 Veritabanı Yönetimi İyileştirmeleri
- [x] PostgreSQL tür logosu (kart/tablo/explorer başlıklarında)
- [x] Tüm bağlantıları tek butonla test etme
- [x] Otomatik sağlık kontrolü (15sn/30sn/1dk polling, ayarlardan yapılandırılır)

### 2.2 Export/Import İyileştirmeleri
- [x] Export modalı: isteğe bağlı şifre (PBKDF2+AES-256) veya düz metin (uyarı ile)
- [x] Import: şifreli dosyalar için modal ile şifre girişi
- [x] Ayarlar (timezone, healthCheckInterval) da export/import kapsamına alındı

### 2.3 Cron Sistemi
- [x] node-cron entegrasyonu (background worker)
- [x] Veritabanı başına cron ifadesi tanımlama UI'ı
- [x] SQLite'ta zamanlama kaydı
- [x] Cron tetiklendiğinde otomatik pg_dump çalıştırma
- [x] Dashboard'da "Sıradaki Zamanlama" kartını gerçek veriye bağlama
- [x] Zamanlanmış yedek geçmişi logları

### 2.4 Bildirimler (İlerleyen Fazlarda Ele Alınacak / Devre Dışı Bırakıldı)
- [ ] Başarılı/başarısız yedek sonrası e-posta bildirimi
- [ ] Webhook desteği (Slack, Discord, vb.)

---

## Phase 3 – Bulut Depolama Entegrasyonu (PLANLANDI)

### 3.1 Depolama Sağlayıcıları
- [ ] Amazon S3 desteği
- [ ] Cloudflare R2 desteği
- [ ] MinIO desteği (S3 uyumlu)
- [ ] Google Cloud Storage (GCS) desteği

### 3.2 Yönetim
- [ ] Ayarlar sayfasında bulut depolama kimlik bilgisi alanları
- [ ] Yedek tamamlandığında otomatik yükleme seçeneği
- [ ] Bulut yedeklerini listeleme ve indirme
- [ ] Yerel + Bulut depolama kullanım istatistikleri

---

## Phase 4 – Geri Yükleme Sistemi (PLANLANDI)

### 4.1 Restore İşlemleri
- [ ] Yedekten geri yükleme butonu (onay modalı ile)
- [ ] pg_restore / psql entegrasyonu
- [ ] Geri yükleme öncesi hedef veritabanı seçimi
- [ ] Geri yükleme logları ve durum takibi

---

## Phase 5 – MongoDB Desteği (PLANLANDI)

### 5.1 Bağlantı & Keşif
- [ ] MongoDB bağlantı desteği (db-client.ts güncelleme)
- [ ] Collection/Document listesi görüntüleme
- [ ] Salt okunur document gezgini

### 5.2 Yedekleme
- [ ] mongodump entegrasyonu (backup-service.ts güncelleme)
- [ ] Dockerfile güncellemesi (mongodump binary ekle)

---

## Phase 6 – Kullanıcı Yönetimi & Güvenlik (PLANLANDI)

- [ ] Temel kullanıcı girişi (username/password, JWT veya session)
- [ ] Çok kullanıcılı erişim yönetimi
- [ ] İki faktörlü kimlik doğrulama (2FA) desteği
- [ ] Rol tabanlı yetkilendirme (Admin / Viewer)

---

## Phase 7 – İleri Özellikler (FİKİR HAVUZU)

- [ ] Veritabanı performans metrikleri (aktif bağlantı sayısı, sorgu süresi vb.)
- [ ] Otomatik şema diff (iki yedek arasında fark)
- [ ] Şifreli yedekler (backup dosyasını da şifrele)
- [ ] Yedek bütünlük doğrulama (checksum)
- [ ] Çoklu dil desteği genişletme (İspanyolca, Almanca vb.)
- [ ] Mobil uyumlu PWA

---

## Teknik Borçlar & Bilinen Sorunlar

| Sorun | Öncelik | Durum |
|---|---|---|
| pg_dump yerel olarak kurulu olmadığında Çevrimdışı olarak işaretleme sorunu | Yüksek | Çözüldü (Phase 1 sonunda) |
| Büyük tablolarda sayfalandırma performansı | Orta | Açık |
| Docker olmadan Windows'ta çalışan pg_dump yolu otomatik tespiti | Düşük | Açık |

---

## Sürüm Geçmişi

| Sürüm | Tarih | Açıklama |
|---|---|---|
| 1.0.0 | 12 Haziran 2026 | Phase 2 tamamlandı – Zamanlanmış otomatik yedekler, sistem saati, zaman dilimi ayarı, tüm bağlantıları test et, otomatik sağlık kontrolü, PostgreSQL logosu, şifreli export/import (ayarlar dahil) |
| 0.1.0-alpha | Haziran 2026 | Phase 1 tamamlandı – temel yedekleme ve dashboard |
