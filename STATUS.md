# VaultBase – Geliştirme Durumu

Son güncelleme: 12 Haziran 2026

---

## Anlık Durum

**Aktif Sürüm:** v0.1.0-alpha  
**Genel Durum:** ✅ Kararlı (Geliştirme Ortamı)  
**Aktif Phase:** Phase 2 (Zamanlanmış Yedekler) – Henüz başlanmadı

---

## Phase 1 Tamamlama Özeti

Phase 1 eksiksiz tamamlandı ve commit edildi.  
Aşağıdaki tüm özellikler çalışır durumda:

### Çalışan Özellikler

| Özellik | Durum | Not |
|---|---|---|
| Veritabanı ekleme | ✅ Çalışıyor | URL ve alan bazlı mod |
| Bağlantı testi | ✅ Çalışıyor | Gerçek pg bağlantısı |
| Veritabanı listeleme | ✅ Çalışıyor | Durum kartları ile |
| /databases Sayfası | ✅ Çalışıyor | Arama, filtreleme (ortam/etiket) ve tüm yönetim işlemleri (test, yedek, düzenle, sil) |
| /archive Sayfası | ✅ Çalışıyor | Arama, veritabanı/durum/tetikleyici filtreleri, depolama istatistikleri, indirme, silme ve toplu temizleme |
| Manuel yedek alma | ✅ Çalışıyor | pg_dump gerektirir (özel isimlendirme destekli) |
| Yedek arşivi | ✅ Çalışıyor | .sql.gz formatı |
| Yedek indirme | ✅ Çalışıyor | API route |
| Yedek silme | ✅ Çalışıyor | Onay modalı ile |
| Arşivi temizle | ✅ Çalışıyor | Toplu silme, onay modalı |
| Tablo gezgini | ✅ Çalışıyor | Salt okunur, sayfalandırılmış |
| Ayarlar export | ✅ Çalışıyor | JSON formatı |
| Ayarlar import | ✅ Çalışıyor | JSON formatı |
| Türkçe arayüz | ✅ Çalışıyor | i18n altyapısı hazır |
| Docker paketi | ✅ Çalışıyor | postgresql-client-18 dahil |
| Onay modalleri | ✅ Çalışıyor | Yedek al, sil, temizle |
| Depolama göstergesi | ✅ Çalışıyor | Limit takibi |

---

## Bilinen Sorunlar

### Çözülmüş
- **[ÇÖZÜLDÜ]** pg_dump bulunamazsa (ENOENT) veritabanını Çevrimdışı olarak yanlış işaretleme
  - Düzeltme: backup-service.ts'de hasErrorOccurred flag + ayrı bağlantı testi
- **[ÇÖZÜLDÜ]** Yedek al modalındaki form alanllarının sıkışık görünmesi
  - Düzeltme: max-w-[600px] override + popper hizalaması
- **[ÇÖZÜLDÜ]** Spawn error + close çift tetiklenme hatası
  - Düzeltme: hasErrorOccurred boolean flag

### Açık
- pg_dump Windows'ta PATH'de yoksa hata mesajı bazen belirsiz olabiliyor
- Büyük tablolarda (>100k satır) explorer yavaşlayabilir

---

## Bağımlılıklar

```json
{
  "next": "16.2.6",
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

## Sonraki Adımlar (Phase 2)

Öncelik sırasına göre:

1. **node-cron entegrasyonu** — background worker kurulumu
2. **Zamanlama UI** — her veritabanı için cron ifadesi tanımlama
3. **"Sıradaki Zamanlama" kartı** — gerçek veriye bağlanma
4. **Zamanlanmış yedek logları** — Son Aktiviteler akışına entegre

---

## Git Durumu

```
Branch: master
Son Commit: feat: implement backup archive page (/archive) with search, filters, stats, and pagination controls
Değiştirilmemiş dosya: Hayır (yedek arşivi eklendi)
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
