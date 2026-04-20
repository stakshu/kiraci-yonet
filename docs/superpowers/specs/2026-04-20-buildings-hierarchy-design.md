# Bina → Daire Hiyerarşisi: Temel Yeniden Yapılandırması

**Tarih:** 2026-04-20
**Hedef:** Mevcut düz `apartments` modeline üstünde gerçek bir `buildings` katmanı eklemek
**Etkilenen dosyalar:** SQL migration (yeni), Properties.jsx (büyük), 7 sayfada query/gösterim güncellemesi, yeni util

## Bağlam

Mevcut durumda `apartments.building` sadece TEXT bir kolon — gerçek bir entity değil, sadece gruplama için serbest metin. Kullanıcı gerçek bir **Bina** katmanı istiyor:

- Binalar bağımsız kayıtlar (adres, şehir, bina yaşı, notlar bina seviyesinde)
- Daireler binaların altında yer alır (kat, daire no, oda, m², kira daire seviyesinde)
- Mülklerim sayfasında **2 dropdown**: Bina seç → Daire seç
- Seçim sonrası mevcut kart görünümü filtrelenir

**Örnek:** Bina *"Cömertkent Sitesi H1 Blok"* → daireleri *"Kat 2 Daire 20"*, *"Kat 3 Daire 15"*

**Kullanıcı kararları:**
- Bina her daire için ZORUNLU (müstakil/villa için bile tek-daireli bina)
- Ayrı `/buildings` rotası yok — sadece Mülklerim sayfasında 2 dropdown
- Mevcut veri silinebilir — temel baştan kuruluyor

## Data Model

### Yeni tablo: `public.buildings`

```sql
create table public.buildings (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  city          text default '',
  district      text default '',
  address       text default '',
  building_age  int,
  notes         text default '',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
```

- RLS: kullanıcı sadece kendi binalarını görür (SELECT/INSERT/UPDATE/DELETE)
- `set_updated_at` trigger'ı
- Index: `idx_buildings_user_id`

### `apartments` refactor

- **Ekle:** `building_id uuid not null references buildings(id) on delete cascade`
- **Düş:** `building` (text), `city`, `district`, `address`, `building_age` — artık bina seviyesinde
- **Koru:** `unit_no`, `floor_no`, `property_type`, `room_count`, `m2_gross`, `m2_net`, `furnished`, `rent`, `lease_end`, `deposit`, `status`, `notes`, `user_id`, `tenant_name`
- Yeni index: `idx_apartments_building_id`
- Mevcut veri: `truncate apartments cascade` güvenli (kullanıcı onayladı)

`tenants.apartment_id` ve `rent_payments.apartment_id` FK'leri değişmez — transitively `buildings`'e ulaşılır.

**Migration dosyası:** `supabase/011_buildings_and_refactor.sql`

## UI

### `src/pages/Properties.jsx` — büyük değişiklik

```
┌──────────────────────────────────────────────────────────┐
│  Mülklerim                              [+ Bina Ekle]    │
│                                                          │
│  ┌──────────────────┐ ┌──────────────────┐              │
│  │ Bina: Tümü    ▼  │ │ Daire: Tümü   ▼  │ [+ Daire]   │
│  │  Cömertkent H1   │ │  Kat 2 Daire 20  │              │
│  │  Cömertkent H2   │ │  Kat 3 Daire 15  │              │
│  │  + Yeni Bina     │ └──────────────────┘              │
│  └──────────────────┘                                    │
│                                                          │
│  (Daire kartları — filtrelenmiş)                        │
└──────────────────────────────────────────────────────────┘
```

**Bina dropdown:**
- Default: "Tümü"
- Seçenekler: binalar + en altta "+ Yeni Bina" butonu
- "Tümü" seçiliyse Daire dropdown disabled

**Daire dropdown:**
- Sadece bir bina seçiliyse aktif
- Default: "Tümü" + o binanın daireleri
- Label: `Kat {floor_no} Daire {unit_no}` (kat yoksa sadece `Daire {unit_no}`)

**Bina CRUD (modal):**
- "+ Bina Ekle" → modal: name*, city, district, address, building_age, notes
- Bina seçiliyken dropdown yanında ✏️ edit icon → aynı modal edit modunda
- Silme: modal içinde "Sil" + onay dialog + cascade uyarısı

**Daire ekle formu:**
- İlk alan: Bina seç dropdown (zorunlu, varsa aktif binayı pre-fill)
- Kaldırılır: city, district, address, building_age (binaya taşındı)
- Kalır: unit_no, floor_no, property_type, room_count, m2_gross, m2_net, furnished, rent, deposit, notes

### Cross-page: `apartmentLabel()` util

Yeni dosya: `src/lib/apartmentLabel.js`

```js
export function apartmentLabel(apt) {
  const name = apt?.buildings?.name || apt?.building?.name || '—'
  const floor = apt?.floor_no ? `Kat ${apt.floor_no} ` : ''
  return `${name} / ${floor}Daire ${apt?.unit_no || '—'}`
}
```

### Etkilenen sayfalar

| Sayfa | Değişiklik |
|---|---|
| `PropertyDetail.jsx` | query join `buildings(...)`; başlık apartmentLabel; Mülk Detayları tab'ında read-only Bina section |
| `TenantDetail.jsx` | query join `apartments(unit_no, floor_no, buildings(name))`; gösterim apartmentLabel |
| `TenantsList.jsx` | satırda bina + daire gösterimi |
| `Dashboard.jsx` | Toplam Bina + Toplam Daire istatistik kartları |
| `RentPayments.jsx`, `OverduePayments.jsx`, `PaymentHistory.jsx`, `Accounting.jsx` | query join + apartmentLabel |

## Animasyon & Stil

- Bina/Daire dropdown'ları: mevcut Properties filter stillerine uyumlu (`rounded-xl`, `var(--border)`)
- Modal açılışı: backdrop blur + spring scale
- Hover: dropdown satırlarında `bg-[var(--bg)]`, spring
- Renk: aktif seçim `#00D47E`, genel stil mevcut sistem

## Verification Checklist

1. `supabase/011_buildings_and_refactor.sql` Supabase Dashboard'da hatasız çalışır
2. `/properties` açılır → "+ Bina Ekle" çalışır, bina listelenir
3. "+ Daire Ekle" → bina zorunlu dropdown, kaydeder
4. İki dropdown filtreleri kombinasyonlu çalışır
5. Bina edit/delete modal çalışır, cascade uyarısı görünür
6. `/properties/:id`, `/tenants/list/:id` doğru bina+daire formatı gösterir
7. Dashboard, ödeme sayfaları, muhasebe bina+daire formatı gösterir
8. RLS: başka user'ın binası görünmez
9. `npm run build` hatasız
10. Dark mode: yeni bileşenler tüm CSS değişkenlerine uyar

## Kapsam Dışı

- `/buildings` rotası
- Bina-seviye gider/aidat dağıtımı
- Eski verinin otomatik migrate edilmesi
- Bina detay sayfası
