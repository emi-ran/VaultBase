# VaultBase – Geliştirme Durumu

Son güncelleme: 12 Haziran 2026

---

## Anlık Durum

**Aktif Sürüm:** 1.0.0  
**Genel Durum:** ✅ Kararlı (Geliştirme & Production Ortamı)  
**Aktif Phase:** Phase 2 (Zamanlanmış Yedekler) – TAMAMLANDI

---

## Phase 1 & 2 Tamamlama Özeti

Phase 1 ve Phase 2 özellikleri eksiksiz tamamlandı, test edildi ve kararlı hale getirildi.  
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
| Tüm Bağlantıları Test Et | ✅ Çalışıyor | /databases sayfasında tek butonla tüm bağlantıları test etme |
| Otomatik Sağlık Kontrolü | ✅ Çalışıyor | Ayarlardan 15sn/30sn/1dk aralıkla otomatik polling, sayfa açıkken çalışır |

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

### Açık
- pg_dump Windows'ta PATH'de yoksa hata mesajı bazen belirsiz olabiliyor
- Büyük tablolarda (>100k satır) explorer yavaşlayabilir

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
| Disk (yedekler) | 1 GB | 10+ GB |

---

## Sonraki Adımlar (Phase 3)

Öncelik sırasına göre:

1. **Bulut depolama entegrasyonu** — Amazon S3, Cloudflare R2, Google Cloud Storage, MinIO entegrasyonları
2. **Otomatik bulut senkronizasyonu** — yedek tamamlandığında otomatik olarak bulut depolamaya kopyalanması
3. **Bulut yedekleri yönetimi** — bulut üzerindeki yedek dosyalarını arama, indirme ve silme arayüzleri

---

## Git Durumu

```
Branch: master
Son Commit: style: add PostgreSQL type logo to database headers (084ceef)
Değiştirilmemiş dosya: Hayır (çalışma dizininde değişiklikler var)
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
