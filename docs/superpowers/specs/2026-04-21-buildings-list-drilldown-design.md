# Mülklerim: Binalar Listesi → Bina Detay Drill-Down

## Context

Bir önceki iterasyonda `buildings` tablosu ve `apartments.building_id` hiyerarşisi kuruldu; Mülklerim sayfasında iki cascading dropdown (Bina → Daire) + tek düz daire tablosu pattern'i uygulandı. Kullanıcı bu gösterimin "kullanıcı dostu olmadığını" bildirdi ve şu yapıyı istedi:

> Mülklerim ana sayfasında **binalar** listelensin. Bir binaya tıklayınca **o binaya ait daireleri** gösteren ayrı bir sayfa açılsın.

Amaç: gezintiyi "filter + flat table" yerine klasik **list → detail drill-down**'a taşımak — çok binalı kullanıcılar için her binanın kendi bağlamı olsun (stats, adres, aksiyonlar), daireler orada yönetilsin.

## Seçimler (kullanıcı onaylı)

- **Bina liste formatı:** Kompakt tablo (kart grid değil) — çünkü veri yoğun, çok sayıda bina için ölçeklenir.
- **Detay açılışı:** Yeni route (`/properties/building/:id`) + breadcrumb. Slide-in panel reddedildi (derin linkleme ve geri tuşu önemli).

## Yeni Sayfa Akışı

```
/properties                           → Binalar tablosu (yeni Properties.jsx)
/properties/building/:buildingId      → Bina detay + daireler (yeni BuildingDetail.jsx)
/properties/:apartmentId              → Daire detay (mevcut PropertyDetail.jsx, değişmez)
```

React Router'da bu sıra önemlidir: `/properties/building/:id` rotası `/properties/:id`'den önce tanımlanmalı (yoksa `building` string'i apartmentId olarak yakalanır).

## Data Flow

SQL şeması aynen kalır — sadece UI değişikliği. `apartmentLabel` / `unitLabel` / `buildingLabel` util'leri aynen kullanılır.

## Sayfa 1: `/properties` — Binalar Listesi

### Layout

```
┌────────────────────────────────────────────────────────────┐
│ Mülklerim (3)                    [+ Bina Ekle] [+ Daire]   │
│                                                            │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐             │
│ │T.Bina│ │T.Daire│ │Kirada│ │Boşta │ │Aylık │             │
│ │  3   │ │  19   │ │  14  │ │  5   │ │187K₺ │             │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘             │
│                                                            │
│ 🔍 Bina / şehir / ilçe ara...                             │
│                                                            │
│ BİNA          ADRES           DAİRE  KİRADA  BOŞ  AYLIK  →│
│ ─────────────────────────────────────────────────────────  │
│ Cömertkent H1 Kadıköy/İst.      12    10     2  125K ₺  › │
│ Ataşehir 1.Bk Ataşehir/İst.      6     4     2   62K ₺  › │
│ Kadıköy Villa Kadıköy/İst.       1     0     1    0 ₺   › │
└────────────────────────────────────────────────────────────┘
```

### Davranışlar

- **Stat kartları:** mevcut 5 kart (Toplam Bina, Toplam Daire, Kirada, Boşta, Aylık Gelir) — kullanıcı tüm portföyü bir bakışta görür.
- **Arama:** tek input; `buildings.name`, `buildings.city`, `buildings.district`, `buildings.address` alanlarında case-insensitive `.includes()` arama.
- **Satıra tıkla:** `navigate('/properties/building/' + b.id)`.
- **`+ Bina Ekle`:** mevcut building modal'ı açar (ekleme modunda).
- **`+ Daire Ekle`:** apartment modal'ı açar. Bina dropdown'u boş; kullanıcı seçer. Hiç bina yoksa önce bina ekleme akışına yönlendirir (mevcut davranış).
- **Tablo satır sağında `›` chevron:** clickability affordance.
- **Hover:** satır `#F8FAFC` arka plan + cursor pointer.

### Satır başına stat hesaplama

Her bina için:
- `daire = apartments.filter(a => a.building_id === b.id).length`
- `kirada = o binanın daireleri içinde tenants[0] olanlar`
- `boşta = daire - kirada`
- `aylık = Σ tenants[0].rent (o binanın daireleri için)`

Bu mevcut `apartments` + `tenants` join'iyle zaten elimizde; ekstra query yok.

## Sayfa 2: `/properties/building/:id` — Bina Detay

### Layout

```
┌────────────────────────────────────────────────────────────┐
│ ← Mülklerim / Cömertkent Sitesi H1 Blok                   │
│                                                            │
│ 🏢 Cömertkent Sitesi H1 Blok          [Düzenle] [Sil]     │
│    Ferit Paşa Mh., Kadıköy/İst. · 5 yaşında               │
│    "Kapıcı Mehmet Bey, 0532 ..."  ← notlar varsa          │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  12 daire · 10 kirada · 2 boşta · 125.000 ₺ aylık │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│                                    [+ Daire Ekle]         │
│                                                            │
│ DAİRE        KİRACI       S.ÖDEME  SÖZLEŞME  AKSİYON      │
│ ───────────────────────────────────────────────────────   │
│ Kat 2 D:20   Ahmet Y.     15 Nis   31 Ara    ✏️  🗑       │
│ Kat 3 D:15   Mehmet K.    15 Nis   01 Haz    ✏️  🗑       │
│ Kat 1 D:5    + Kiracı Ekle   —        —      ✏️  🗑       │
│ ...                                                        │
└────────────────────────────────────────────────────────────┘
```

### Davranışlar

- **Breadcrumb `← Mülklerim`:** `navigate('/properties')`. Klasik tarayıcı geri tuşu da çalışır (yeni route olduğu için).
- **`[Düzenle]`:** building modal'ı edit modunda açar (mevcut `openBldEdit` mantığı).
- **`[Sil]`:** confirm dialog + cascade uyarısı ("X daire ve kiracılar silinecek"). Silme sonrası `/properties`'e yönlendir.
- **`[+ Daire Ekle]`:** apartment modal'ı, `building_id` bu bina olarak pre-fill edilmiş. Kullanıcı bina seçmek zorunda değil (ama değiştirebilir — isteyen dropdown'dan başka binaya taşıyabilir).
- **Daire tablosu:** kolonlar bire bir mevcut Properties tablosundan kopyalanır. Tek fark: "Daire Bilgileri" kolonundaki label `unitLabel(apt)` kullanır (sadece "Kat 2 Daire 20") — bina adı her satırda tekrar etmez, sayfanın üstünde bir kez görünür.
- **Satıra tıkla:** `navigate('/properties/' + apt.id)` (PropertyDetail.jsx'e gider — mevcut davranış).
- **Kiraci Ekle / Düzenle / Sil:** mevcut Properties.jsx'teki modaller ve handler'lar bire bir taşınır.
- **404 davranışı:** URL'deki `:id` mevcut değilse (veya başka kullanıcının binasıysa RLS nedeniyle null gelir) → `/properties`'e redirect + toast "Bina bulunamadı".

## Route Güncellemesi

`src/App.jsx` veya router tanımı yapılan dosya:

```jsx
<Route path="/properties" element={<Properties />} />
<Route path="/properties/building/:id" element={<BuildingDetail />} />
<Route path="/properties/:id" element={<PropertyDetail />} />
```

**Sıra önemli:** `building` statik segmenti `:id` catch-all'dan önce gelmeli.

## Etkilenen / Yeni Dosyalar

### Yeni
- `src/pages/BuildingDetail.jsx` — bina detay + daireler sayfası. Mevcut Properties.jsx'in apartment tablosu + apartment modal + tenant modal mantığının taşınmış versiyonu.

### Değişen
- `src/pages/Properties.jsx` — tamamen yeniden yazılır. Filter dropdown'lar ve apartment tablosu çıkar; binalar tablosu ve building modal (yalnızca ekleme için) kalır.
- `src/App.jsx` (router) — yeni route eklenir.

### Değişmeyen
- `src/pages/PropertyDetail.jsx`
- `src/pages/TenantDetail.jsx`, `TenantsList.jsx`, `Dashboard.jsx`
- `src/pages/RentPayments.jsx`, `OverduePayments.jsx`, `PaymentHistory.jsx`, `Accounting.jsx`, `Expenses.jsx`
- `src/lib/apartmentLabel.js`
- SQL şeması (`supabase/011_buildings_and_refactor.sql`)
- Sidebar nav (Mülklerim → `/properties` aynı)

## Estetik & Motion

CLAUDE.md kurumsal kimlik ile aynı hattı sürdürür:
- Plus Jakarta Sans, teal `#025864` primer, green `#00D47E` accent.
- Bina tablosu satırları stagger fade-in (Motion, mevcut pattern).
- Breadcrumb küçük, ince; bina başlığı bold (`font-extrabold`) ve `tracking-tight`.
- Bina detayında üst "info strip" mevcut Properties.jsx'teki `selectedBld` info strip'in evrilmiş hali (gradient bg, ikonlu).

## Verification

1. `npm run dev` → `/properties` açılır, 3 bina satır satır listelenir.
2. Aramaya "Kadıköy" yaz → sadece eşleşen binalar gelir.
3. Bir satıra tıkla → `/properties/building/:id` açılır, doğru bina detayı ve daireler listelenir, breadcrumb görünür.
4. Daire tablosundaki bir satıra tıkla → `/properties/:apartmentId` (PropertyDetail) açılır.
5. Tarayıcı geri tuşu → bina detayına, tekrar geri → ana listeye döner.
6. "+ Daire Ekle" (detay sayfası) → modal `building_id` pre-filled gelir; kaydet → daire tabloya eklenir.
7. "+ Bina Ekle" (ana sayfa) → modal boş açılır; kaydet → bina tablosuna eklenir.
8. Detay sayfasında "Sil" → confirm + cascade uyarısı + başarıyla silinince `/properties`'e redirect + toast.
9. Var olmayan `/properties/building/<random-uuid>` URL'i → `/properties`'e redirect + toast.
10. `npm run build` → hatasız.

## Kapsam Dışı

- Bina bazlı gider dağıtımı / aidat yönetimi (sonraki faz).
- Bina resim / fotoğraf yükleme.
- Bina detay sayfasında istatistik grafikleri (basit inline stat şeridi yeterli).
- Mevcut Properties'teki "status filter" (Kirada/Boşta) — detay sayfasına taşınmaz; gereksiz karmaşa, 10-15 daireli binada gözle ayırmak yeterli.

## Skills Workflow

Brainstorming (bu spec) → writing-plans (implementation plan) → frontend-design (UI fazında). Aşağıdaki adımda writing-plans skill'i çağrılıp bu spec'ten detaylı implementation planı üretilecektir.
