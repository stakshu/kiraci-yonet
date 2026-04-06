# Kiracı ve Mülk Yönetim Uygulaması — Proje Dokümanı

> **ÖNEMLİ NOT:** Bu doküman bir uygulama geliştirme yol haritasıdır. Antigravity / AI kod asistanına verildiğinde, uygulamanın tamamı **bir seferde** geliştirilmemelidir. **Her faz tamamlanmadan bir sonrakine geçilmemelidir.** Her faz sonunda kullanıcıdan onay alınmalı, test edilmeli, sonra ilerlenmelidir. Uzun ve karmaşık kod blokları yerine **küçük, okunabilir ve test edilebilir** parçalar üretilmelidir.

---

## 1. Proje Özeti

Bu proje, gayrimenkul sahipleri ve küçük/orta ölçekli mülk yönetim firmaları için tasarlanmış, **web tabanlı bir kiracı ve mülk yönetim uygulamasıdır**. Almanya merkezli Immoware24 yazılımından esinlenmiştir; ancak daha sade, modüler ve adım adım geliştirilebilir bir yapıdadır.

**Hedef:** Kullanıcının dairelerini, kiracılarını, kira ödemelerini, işletme giderlerini ve belgelerini tek bir arayüzden yönetebilmesi.

---

## 2. Teknoloji Yığını (Tech Stack)

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| **Frontend** | HTML5 + CSS3 + Vanilla JavaScript | Tek sayfa yapı (SPA mantığı, ama sade). İlk aşamada framework yok. |
| **Stil** | TailwindCSS (CDN) veya saf CSS | Modern, simetrik, responsive tasarım için |
| **Backend** | **Supabase** | PostgreSQL veritabanı + Auth + Storage + Realtime |
| **Auth** | Supabase Auth | E-posta + şifre ile giriş |
| **Storage** | Supabase Storage | Doküman/dosya yükleme için |
| **E-posta** | Supabase Edge Functions + Resend / SendGrid | Otomatik mail gönderimi için |
| **Hosting** | Vercel / Netlify / GitHub Pages | Statik HTML hosting |

> **Not:** İlk fazda her şey tek bir `index.html` dosyası içinde olacak. İlerleyen fazlarda modüler dosya yapısına geçilebilir.

---

## 3. Geliştirme Felsefesi (ÇOK ÖNEMLİ)

AI asistanın **mutlaka** uyması gereken kurallar:

1. **Adım adım ilerle.** Her fazı ayrı ayrı geliştir. Bir faz biter, test edilir, kullanıcı onaylar, sonra diğerine geçilir.
2. **Her seferinde tek dosya / tek özellik.** "Hadi tüm uygulamayı yazalım" yaklaşımı yasaktır.
3. **Kod kısa ve okunabilir olmalı.** Karmaşık fonksiyonlar küçük parçalara bölünmelidir.
4. **Her fazın sonunda mutlaka açıklama yap.** "Şu dosyayı oluşturdum, şunları ekledim, şimdi şunu test et" gibi.
5. **Tasarım önemlidir.** Her ekranın simetrik, hizalı, modern ve estetik olmasına özen gösterilmelidir. UI öncelik!
6. **Hata yönetimi unutulmamalı.** Her API çağrısında try/catch, kullanıcıya görsel geri bildirim (toast, alert).
7. **Yorum satırları ekle.** Türkçe açıklayıcı yorumlar.

---

## 4. Tasarım ve UI/UX Prensipleri

Bu uygulama **görsel olarak profesyonel** olmalıdır. Aşağıdaki kurallara dikkat edilmelidir:

### 4.1. Genel Tasarım Kuralları
- **Simetri:** Tüm kart, form ve liste elemanları hizalı olmalı. Padding ve margin değerleri tutarlı (8/16/24/32 px sistemi).
- **Renk Paleti:** Profesyonel ve sade bir palet kullanılmalı.
  - Ana renk: `#2563EB` (mavi) veya `#0F172A` (lacivert)
  - Vurgu: `#10B981` (yeşil — ödendi) / `#EF4444` (kırmızı — gecikmiş) / `#F59E0B` (sarı — yaklaşan)
  - Arka plan: `#F8FAFC` (açık gri)
  - Kart: `#FFFFFF` (beyaz, hafif gölge)
- **Tipografi:** `Inter`, `Poppins` veya `system-ui` font ailesi.
- **Boşluklar:** Nefes alan tasarım. Yoğun değil.
- **Köşeler:** `border-radius: 12px` (kartlar), `8px` (butonlar, inputlar).
- **Gölge:** Hafif `box-shadow: 0 1px 3px rgba(0,0,0,0.1)`.
- **Responsive:** Mobil, tablet, masaüstü uyumlu.

### 4.2. Ana Layout
```
+---------------------------------------------------+
|  LOGO    [Ana Sayfa] [Daireler] [Kiracılar] ...   |  <- Üst Navbar
+---------------------------------------------------+
|                                                   |
|   [İçerik Alanı — sayfa burada değişecek]        |
|                                                   |
+---------------------------------------------------+
```

veya alternatif olarak sol kenarda sidebar:

```
+--------+----------------------------------------+
| LOGO   |   Üst Bar (kullanıcı, çıkış vs.)       |
|--------+----------------------------------------+
| Daire  |                                        |
| Kiracı |     İçerik Alanı                       |
| Mali.  |                                        |
| Ayar.  |                                        |
+--------+----------------------------------------+
```

> **İlk fazda üst navbar tercih edilmelidir.** Daha basit ve hızlı.

### 4.3. UI Bileşenleri (Component listesi)
- Buton (primary, secondary, danger)
- Input (text, number, date, email, select)
- Kart (apartment card, tenant card, payment card)
- Modal / Pop-up (form ekleme/düzenleme için)
- Toast (bildirim)
- Tablo (responsive)
- Badge (durum etiketleri: Kiralanmış / Boş / Ödendi / Gecikmiş)

---

## 5. Veritabanı Tasarımı (Supabase / PostgreSQL)

Aşağıdaki tablolar Supabase üzerinde oluşturulmalıdır. AI asistan, ilgili faz geldiğinde bu tabloları SQL ile oluşturup migration olarak kaydetmelidir.

### 5.1. `users` (Supabase Auth tarafından otomatik yönetilir)
Standart Supabase auth tablosu kullanılır.

### 5.2. `apartments` (Daireler)
| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | uuid (PK) | Benzersiz kimlik |
| `user_id` | uuid (FK → users) | Hangi kullanıcıya ait |
| `title` | text | Dairenin adı/etiketi (örn: "Kadıköy 3+1") |
| `address` | text | Tam adres |
| `city` | text | Şehir |
| `district` | text | İlçe |
| `square_meters` | numeric | m² |
| `rooms` | text | Oda sayısı (örn: "3+1") |
| `floor` | int | Kat |
| `independent_section_no` | text | Bağımsız bölüm numarası |
| `location_lat` | numeric (nullable) | Enlem (opsiyonel) |
| `location_lng` | numeric (nullable) | Boylam (opsiyonel) |
| `rent_amount` | numeric | Aylık kira tutarı |
| `rent_due_day` | int | Her ayın hangi günü kira ödenir (1-31) |
| `currency` | text | TL / EUR / USD |
| `notes` | text (nullable) | Notlar |
| `created_at` | timestamp | Oluşturulma tarihi |

### 5.3. `tenants` (Kiracılar)
| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | uuid (PK) | Benzersiz kimlik |
| `user_id` | uuid (FK → users) | Hangi kullanıcıya ait |
| `full_name` | text | Ad Soyad |
| `email` | text | E-posta (zorunlu — bildirimler için) |
| `phone` | text | Telefon |
| `id_number` | text (nullable) | TC Kimlik / Pasaport |
| `apartment_id` | uuid (FK → apartments, nullable) | Hangi daireyle eşleştirilmiş |
| `lease_start_date` | date | Sözleşme başlangıcı |
| `lease_end_date` | date (nullable) | Sözleşme bitişi |
| `deposit_amount` | numeric | Depozito |
| `notes` | text | Notlar |
| `created_at` | timestamp | Oluşturulma tarihi |

### 5.4. `rent_payments` (Kira Ödemeleri)
| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | uuid (PK) | Benzersiz kimlik |
| `tenant_id` | uuid (FK → tenants) | Hangi kiracı |
| `apartment_id` | uuid (FK → apartments) | Hangi daire |
| `period_year` | int | Yıl (örn: 2026) |
| `period_month` | int | Ay (1-12) |
| `due_date` | date | Vade tarihi |
| `paid_date` | date (nullable) | Ödeme yapıldı ise tarihi |
| `amount` | numeric | Tutar |
| `status` | text | `pending` / `paid` / `overdue` |
| `created_at` | timestamp | |

### 5.5. `operating_costs` (İşletme Giderleri)
| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | uuid (PK) | |
| `apartment_id` | uuid (FK → apartments) | |
| `category` | text | Aidat, su, ısınma, elektrik, bakım vb. |
| `amount` | numeric | Tutar |
| `date` | date | Gider tarihi |
| `description` | text | Açıklama |
| `is_billed_to_tenant` | boolean | Kiracıya yansıtılacak mı |
| `created_at` | timestamp | |

### 5.6. `documents` (Doküman Yönetimi)
| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → users) | |
| `apartment_id` | uuid (FK → apartments, nullable) | |
| `tenant_id` | uuid (FK → tenants, nullable) | |
| `file_name` | text | Dosya adı |
| `file_url` | text | Supabase Storage URL |
| `file_type` | text | sözleşme, fatura, tapu, vb. |
| `uploaded_at` | timestamp | |

### 5.7. `accounting_entries` (Muhasebe Kayıtları)
| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → users) | |
| `apartment_id` | uuid (FK → apartments, nullable) | |
| `type` | text | `income` / `expense` |
| `category` | text | Kira geliri, tamir, vergi, vb. |
| `amount` | numeric | Tutar |
| `date` | date | |
| `description` | text | |
| `created_at` | timestamp | |

### 5.8. `email_logs` (Gönderilen Mailler)
| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | uuid (PK) | |
| `tenant_id` | uuid (FK → tenants) | |
| `email_type` | text | reminder / overdue / receipt |
| `subject` | text | |
| `body` | text | |
| `sent_at` | timestamp | |
| `status` | text | sent / failed |

### 5.9. RLS (Row Level Security)
**Çok önemli:** Tüm tablolarda RLS etkinleştirilmeli ve her kullanıcı sadece kendi `user_id`'sine ait verileri görebilmelidir. Supabase policy'leri her tablo için yazılmalıdır.

---

## 6. Geliştirme Fazları (Roadmap)

> Her faz tek başına bir milestone'dur. Her fazın sonunda commit atılmalı ve test edilmelidir.

### **FAZ 0 — Kurulum ve Hazırlık**
**Hedef:** Çalışan boş bir proje iskeletinin oluşturulması.

**Yapılacaklar:**
1. `index.html` dosyası oluşturulur. Temel HTML5 yapı.
2. TailwindCSS CDN ile eklenir.
3. Supabase JavaScript SDK CDN ile eklenir.
4. Supabase projesi oluşturulur (kullanıcı manuel olarak supabase.com'da yapacak).
5. Supabase URL ve anon key, `index.html` içinde bir `config` objesine yerleştirilir.
6. Sayfa açıldığında "Kiracı Yönetim Sistemi" başlığı ve "Hoş geldiniz" yazısı gösterilir.

**Çıktı:** Çalışan boş bir HTML sayfası + Supabase bağlantısı.

**Test:** Sayfa açılıyor mu? Konsolda Supabase istemcisi initialize oluyor mu?

---

### **FAZ 1 — Kimlik Doğrulama (Authentication)**
**Hedef:** Kullanıcı kayıt + giriş + çıkış sistemi.

**Yapılacaklar:**
1. Giriş ekranı (email + şifre) tasarlanır. Modern, ortalanmış kart yapısı.
2. Kayıt ekranı oluşturulur.
3. Supabase Auth ile bağlantı kurulur (`signUp`, `signInWithPassword`, `signOut`).
4. Giriş yapmamış kullanıcı sadece login/register görür.
5. Giriş yapan kullanıcı ana paneli görür.
6. Üst sağ köşede kullanıcı emaili + "Çıkış" butonu.
7. Sayfa yenilense bile session korunur (`onAuthStateChange`).

**UI önemli:** Login ekranı estetik olmalı. Ortalanmış kart, gradient arka plan, logo alanı.

**Test:** Kayıt ol, çıkış yap, giriş yap, sayfayı yenile.

---

### **FAZ 2 — Ana Layout ve Navigasyon**
**Hedef:** Üst navbar + sayfa geçişleri (SPA mantığı).

**Yapılacaklar:**
1. Üst navbar oluşturulur:
   - Logo (sol)
   - Menü öğeleri: `Daireler`, `Kiracılar`, `Ödemeler`, `Giderler`, `Muhasebe`, `Belgeler`, `Ayarlar`
   - Sağda kullanıcı bilgisi + çıkış
2. JavaScript ile sayfa geçişleri yapılır (her menü tıklamasında ilgili `<section>` görünür, diğerleri gizlenir).
3. Her sayfa için boş placeholder section'lar oluşturulur.
4. Aktif menü öğesi vurgulanır (alt çizgi veya farklı renk).

**UI önemli:** Navbar simetrik ve hizalı olmalı. Hover efektleri.

**Test:** Menüler arasında geçiş çalışıyor mu?

---

### **FAZ 3 — Daire Yönetimi (CRUD)**
**Hedef:** Daire ekleme, listeleme, düzenleme, silme.

**Yapılacaklar:**
1. Supabase'de `apartments` tablosu oluşturulur (SQL editor'den).
2. RLS policy yazılır.
3. "Daireler" sayfasında:
   - Üstte "+ Yeni Daire Ekle" butonu
   - Altında daire kartlarının grid'i (responsive: mobilde 1, tablette 2, masaüstünde 3 sütun)
4. "Yeni Daire Ekle" butonuna tıklayınca modal açılır. Form alanları:
   - Daire adı / etiket
   - Adres
   - Şehir, İlçe
   - m²
   - Oda sayısı
   - Kat
   - Bağımsız bölüm no
   - Konum (enlem/boylam — opsiyonel)
   - Aylık kira tutarı
   - Para birimi (TL/EUR/USD)
   - **Kira ödeme günü** (her ayın 1-31. günü)
   - Notlar
5. Form gönderilince Supabase'e kaydedilir.
6. Liste otomatik yenilenir.
7. Her kart üzerinde durum etiketi: **"Boş"** (henüz kiracı yok) — yeşil/gri badge.
8. Kart üzerinde "Düzenle" ve "Sil" butonları.

**UI önemli:** Kartlar simetrik, eşit yükseklik, hizalı. Modal ortalanmış, blur arka plan.

**Test:** Daire ekle, listele, düzenle, sil. Sayfa yenilenince veriler kalıyor mu?

---

### **FAZ 4 — Kiracı Yönetimi (CRUD)**
**Hedef:** Kiracı ekleme, listeleme, düzenleme, silme.

**Yapılacaklar:**
1. Supabase'de `tenants` tablosu oluşturulur. RLS policy.
2. "Kiracılar" sayfasında:
   - Üstte "+ Yeni Kiracı Ekle" butonu
   - Altında kiracı tablosu veya kart listesi
3. Kiracı ekleme formu:
   - Ad Soyad
   - **E-posta (zorunlu)**
   - Telefon
   - TC Kimlik (opsiyonel)
   - **Atanacak daire** (dropdown — sadece "Boş" olan daireler listelenir)
   - Sözleşme başlangıç tarihi
   - Sözleşme bitiş tarihi (opsiyonel)
   - Depozito tutarı
   - Notlar
4. Kiracı eklenince ilgili dairenin durumu otomatik **"Kiralanmış"** olur.
5. Kiracı listesinde her kayıt için: ad, email, atandığı daire, sözleşme tarihleri.
6. Düzenle / Sil butonları.
7. Kiracı silinince daire tekrar "Boş" durumuna döner.

**Test:** Kiracı ekle, daire dropdown'da boş daireler geliyor mu? Kiracı eklendiğinde daire kartı "Kiralanmış" oluyor mu?

---

### **FAZ 5 — Daire-Kiracı Eşleştirme Görünümü**
**Hedef:** Daire kartlarının kiracı bilgisini göstermesi.

**Yapılacaklar:**
1. Daireler sayfasında her kart üzerinde:
   - Eğer dairede kiracı varsa: **"Kiralanmış — [Kiracı Adı]"** yeşil badge.
   - Eğer dairede kiracı yoksa: **"Boş"** gri badge.
2. Karta tıklandığında detay sayfası/modal açılır:
   - Daire bilgileri
   - Kiracı bilgileri (varsa)
   - Geçmiş kira ödemeleri
   - Toplam tahsilat
3. Daire-kiracı ilişkisi join sorgusu ile çekilir (Supabase `select` with foreign key).

**Test:** Bir daireye kiracı ata, kart üstünde isim görünüyor mu?

---

### **FAZ 6 — Kira Ödemeleri Takibi**
**Hedef:** Aylık kira ödeme takibi, durum görünümü, gün sayacı.

**Yapılacaklar:**
1. Supabase'de `rent_payments` tablosu oluşturulur. RLS policy.
2. Bir kiracı eklenince **otomatik** olarak gelecek 12 ayın ödeme kayıtları `pending` olarak oluşturulur. (Trigger veya kod ile.)
   - `due_date`: o ayın `rent_due_day`'i
   - `amount`: dairenin kira tutarı
   - `status`: pending
3. "Ödemeler" sayfasında:
   - Filtre: tüm / bekleyen / ödenen / gecikmiş
   - Tablo: kiracı, daire, ay, vade tarihi, tutar, durum, kalan gün, aksiyon
4. Her satırda durum etiketi:
   - **Ödendi** ✓ (yeşil)
   - **Bekliyor** (sarı) — vade yaklaştıysa "X gün kaldı"
   - **Gecikmiş** (kırmızı) — vade geçmişse "X gün gecikti"
5. "Ödendi olarak işaretle" butonu (her satırda). Tıklanınca `paid_date` = bugün, `status` = paid.
6. Ana sayfada (dashboard'da) özet kart:
   - Bu ay tahsil edilen
   - Bu ay bekleyen
   - Gecikmiş ödeme sayısı
7. Gün hesaplaması JavaScript ile yapılır: `(due_date - bugün)` farkı.

**UI önemli:** Renk kodlaması net. Gecikenler dikkat çekici kırmızı.

**Test:** Kiracı ekle → ödemeler otomatik oluştu mu? Tarihleri değiştir, durumlar doğru hesaplanıyor mu?

---

### **FAZ 7 — Otomatik E-Posta Bildirimleri**
**Hedef:** Kiracılara otomatik mail gönderimi.

**Yapılacaklar:**
1. Supabase Edge Function oluşturulur (`send-rent-reminder`).
2. **Resend** veya **SendGrid** API anahtarı edge function'a tanımlanır.
3. Gönderilecek mail tipleri:
   - **Hatırlatma:** Vade tarihinden 3 gün önce ("Sayın [İsim], [Tarih] tarihinde [Tutar] TL kira ödemeniz bulunmaktadır.")
   - **Vade günü:** Vade gününde
   - **Gecikme:** Vade geçtiyse her 3 günde bir
   - **Ödeme alındı:** Ödeme işaretlenince teşekkür maili
4. Edge function'u tetikleyen bir Supabase scheduled job (cron) kurulur. Günde 1 kez çalışır.
5. Manuel "Hatırlatma Gönder" butonu da eklenir (ödemeler tablosunda her satıra).
6. Gönderilen her mail `email_logs` tablosuna kaydedilir.
7. Kullanıcı (mülk sahibi) "Ayarlar" sayfasından mail şablonlarını düzenleyebilir.

**Not:** Sadece **giden** mail desteklenecek. Gelen mail / inbox yok.

**Test:** Manuel butona bas, mail geliyor mu? Log tablosuna düştü mü?

---

### **FAZ 8 — İşletme Giderleri**
**Hedef:** Daire bazında işletme giderlerinin kaydı ve hesaplanması.

**Yapılacaklar:**
1. Supabase'de `operating_costs` tablosu. RLS policy.
2. "Giderler" sayfasında:
   - Filtre: daire seç
   - "+ Yeni Gider Ekle" butonu
3. Gider ekleme formu:
   - Daire seç
   - Kategori (aidat, su, elektrik, ısınma, bakım, sigorta, diğer)
   - Tutar
   - Tarih
   - Açıklama
   - "Kiracıya yansıtılsın mı?" checkbox
4. Liste tablosu: tarih, daire, kategori, tutar, kiracıya yansıtıldı mı.
5. Toplamlar:
   - Aylık toplam gider
   - Yıllık toplam gider
   - Kategori bazında dağılım (basit bar chart — Chart.js opsiyonel)
6. Daire detay sayfasında o daireye ait giderlerin özeti.

**Test:** Gider ekle, filtreleme çalışıyor mu, toplamlar doğru mu?

---

### **FAZ 9 — Muhasebe Sistemi**
**Hedef:** Genel gelir/gider kaydı ve raporlama.

**Yapılacaklar:**
1. `accounting_entries` tablosu. RLS policy.
2. Kira ödemeleri otomatik olarak `income` tipinde muhasebeye yansır (trigger).
3. İşletme giderleri otomatik olarak `expense` tipinde yansır.
4. "Muhasebe" sayfasında:
   - Üstte özet kartlar: **Toplam Gelir**, **Toplam Gider**, **Net Kar**
   - Dönem filtresi (ay, yıl, özel aralık)
   - Detaylı tablo: tarih, daire, tip, kategori, tutar, açıklama
5. Manuel kayıt ekleme imkanı (örn: tamir gideri, vergi).
6. **Raporlama:** Excel/CSV export butonu.
7. Basit bir grafik: Aylık gelir-gider trendi (Chart.js).

**Test:** Bir kira ödemesi işaretle, muhasebede otomatik kayıt oluştu mu?

---

### **FAZ 10 — Doküman Yönetimi**
**Hedef:** Dosya yükleme ve kategorilere göre saklama.

**Yapılacaklar:**
1. Supabase Storage'da bir bucket oluşturulur (`documents`).
2. RLS policy: kullanıcı sadece kendi dosyalarını görür.
3. `documents` tablosu oluşturulur.
4. "Belgeler" sayfasında:
   - "+ Yeni Belge Yükle" butonu
   - Yükleme formu: dosya, kategori (sözleşme, fatura, tapu, sigorta poliçesi, diğer), ilgili daire, ilgili kiracı
   - Dosya Supabase Storage'a yüklenir, URL'i `documents` tablosuna kaydedilir.
5. Liste: dosya adı, kategori, daire, kiracı, yüklenme tarihi, indir butonu, sil butonu.
6. Daire detay sayfasında o daireye ait belgeler listelenir.
7. Kiracı detay sayfasında da aynı şekilde.

**Test:** Bir PDF yükle, indir butonuna bas, açılıyor mu?

---

### **FAZ 11 — Kat Mülkiyeti / Site Yönetimi**
**Hedef:** Birden fazla daireyi içeren bir "site" yapısının yönetimi.

**Yapılacaklar:**
1. Yeni tablo: `sites` (id, user_id, name, address, total_units, common_fee_amount).
2. `apartments` tablosuna `site_id` (nullable, FK) eklenir.
3. "Siteler" sayfası açılır.
4. Site ekleme formu: ad, adres, toplam birim sayısı, aidat tutarı.
5. Bir site altına dahil edilmiş daireler listelenir.
6. Site bazında toplam:
   - Kira geliri
   - Aidat tahsilatı
   - Ortak giderler
7. Aidat takibi: her birim için aylık aidat ödeme durumu.
8. Site sakinlerine toplu mail gönderimi (örn: "Asansör bakımı yapılacak").

**Test:** Bir site oluştur, içine daire ata, toplamlar doğru mu?

---

### **FAZ 12 — Özel Mülk Yönetimi (Sondereigentum)**
**Hedef:** Mülk sahibi adına yönetilen birimlerin ayrı muhasebe ile takibi.

**Yapılacaklar:**
1. `apartments` tablosuna `owner_name`, `owner_email`, `is_managed_for_owner` (bool) alanları eklenir.
2. Eğer bir daire başkası adına yönetiliyorsa:
   - O dairenin gelir-gideri ayrı bir hesapta tutulur.
   - Mülk sahibine aylık raporlama maili gönderilir.
   - Yönetim ücreti (komisyon) hesaplanır (örn: kiranın %8'i).
3. "Mülk Sahipleri" sayfası açılır.
4. Mülk sahibi bazında raporlama.

**Test:** Bir daireyi "başkası adına yönetiliyor" olarak işaretle, ayrı muhasebe görünüyor mu?

---

### **FAZ 13 — Dashboard (Ana Sayfa)**
**Hedef:** Tüm verilerin özetlendiği ana panel.

**Yapılacaklar:**
1. Ana sayfa (giriş yapınca ilk gelinen ekran):
   - **Üst kart sırası:** Toplam daire, kiralı daire, boş daire, toplam kiracı
   - **Orta sıra:** Bu ay tahsil edilen kira, bekleyen, gecikmiş
   - **Alt:** Son 5 ödeme, yaklaşan vadeli ödemeler, son eklenen belgeler
   - **Grafikler:** Aylık gelir trendi (Chart.js), doluluk oranı (donut chart)
2. Tüm kartlar tıklanabilir → ilgili sayfaya yönlendirir.

**UI çok önemli:** Bu ekran "vitrin"dir. Estetik, hizalı, bilgi yoğun ama dağınık değil.

---

### **FAZ 14 — Ayarlar ve Profil**
**Hedef:** Kullanıcı ayarları.

**Yapılacaklar:**
1. Profil bilgileri (ad, email, şifre değiştirme).
2. Mail şablonları düzenleme.
3. Para birimi varsayılanı.
4. Bildirim tercihleri.
5. Veri export (tüm verileri JSON olarak indir).
6. Hesap silme.

---

### **FAZ 15 — Polish, Test ve Deploy**
**Hedef:** Son rötuşlar ve yayına alma.

**Yapılacaklar:**
1. Tüm ekranlarda responsive test.
2. Hata durumları için kullanıcı dostu mesajlar.
3. Yükleme durumları (spinner, skeleton).
4. Empty state'ler ("Henüz daire eklemediniz" gibi).
5. Onaylama dialogları (silme öncesi).
6. Performans optimizasyonu.
7. Vercel/Netlify üzerinden deploy.

---

## 7. Dosya Yapısı (Önerilen)

İlk fazlarda her şey `index.html` içinde olabilir. İlerleyen fazlarda şu yapıya geçilebilir:

```
/proje
├── index.html
├── /css
│   └── style.css
├── /js
│   ├── config.js          (Supabase URL/key)
│   ├── auth.js            (Giriş/kayıt fonksiyonları)
│   ├── apartments.js      (Daire CRUD)
│   ├── tenants.js         (Kiracı CRUD)
│   ├── payments.js        (Ödeme takibi)
│   ├── costs.js           (İşletme giderleri)
│   ├── accounting.js      (Muhasebe)
│   ├── documents.js       (Belge yönetimi)
│   ├── sites.js           (Site yönetimi)
│   ├── dashboard.js       (Ana sayfa)
│   └── utils.js           (Yardımcı fonksiyonlar)
└── /assets
    └── logo.svg
```

---

## 8. Önemli Notlar ve Dikkat Edilecekler

1. **Güvenlik:** Supabase anon key herkese açıktır. Asıl güvenlik **RLS policy'lerle** sağlanır. Her tablo için mutlaka policy yazılmalıdır.
2. **Servis anahtarları (service_role):** Asla frontend'de kullanılmamalıdır. Sadece edge function içinde.
3. **Mail gönderimi:** Resend veya SendGrid API key'i edge function ortam değişkeninde tutulmalı.
4. **Validation:** Tüm formlarda hem frontend hem backend tarafında doğrulama olmalı.
5. **Tarih formatı:** Tüm tarihler ISO 8601 (`YYYY-MM-DD`) olarak saklanır, gösterilirken `dd.MM.yyyy` formatına çevrilir.
6. **Para birimi:** Sayılar `Intl.NumberFormat` ile formatlanmalı.
7. **Türkçe karakter desteği:** `<meta charset="UTF-8">` mutlaka.
8. **Erişilebilirlik:** Form etiketleri `<label>` ile, butonlar anlamlı `aria-label`'larla.

---

## 9. AI Asistana Talimatlar (ÖZET)

Sevgili AI asistan, bu projeyi geliştirirken:

1. **Faz 0'dan başla.** Sırayı atlama.
2. **Her fazın başında** ne yapacağını madde madde açıkla.
3. **Her fazın sonunda** ne yaptığını ve nasıl test edileceğini açıkla.
4. **Onay almadan** bir sonraki faza geçme.
5. **Kodu küçük parçalara böl.** Bir mesajda 200 satırdan fazla kod yazma.
6. **Tasarıma özen göster.** Çirkin, hizasız, asimetrik UI yasaktır.
7. **Hata yönetimi** ekle. Try/catch ve kullanıcıya görsel geri bildirim.
8. **Türkçe yorum satırları** kullan.
9. **Supabase SQL'lerini** ayrı bloklarda ver, kullanıcı kopyalayıp Supabase SQL editor'e yapıştırabilsin.
10. **Test adımlarını** her fazın sonunda yaz.

---

## 10. Başlangıç Adımı (Kullanıcının Yapacakları)

Kullanıcının (proje sahibi) önce yapması gerekenler:

1. [supabase.com](https://supabase.com) üzerinden ücretsiz hesap oluştur.
2. Yeni bir proje oluştur.
3. Project URL ve Anon Key'i not al.
4. Bu dokümanı AI asistana ver ve "Faz 0'dan başla" de.

---

**Doküman versiyonu:** 1.0
**Hazırlanma tarihi:** 2026
**Hedef platform:** Web (HTML + Supabase)
