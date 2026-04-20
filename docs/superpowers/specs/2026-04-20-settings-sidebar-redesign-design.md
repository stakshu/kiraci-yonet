# Ayarlar — Sol Dikey Navigasyon Yeniden Tasarımı

**Tarih:** 2026-04-20
**Hedef dosya:** `src/pages/Settings.jsx` (tamamen yeniden yazılır)
**Etkilenen diğer dosyalar:** yok

## Bağlam

Ayarlar sayfası art arda üç farklı tasarımda reddedildi:
1. Generic card-list — overflow ve üst üste binme
2. Pure Tailwind card-list — butonlar kesildi
3. "Kontrol Paneli" üst tab bar — tab overflow, içerik sıkışıklığı

Ortak sorun: **yatay düzlemde sığdırma baskısı**. Üstte 7 tab dar ekranda sıkışıyor, butonlar kesiliyor, içerik üst üste biniyor.

## Çözüm Yönü: Sol Dikey Navigasyon + Sağ İçerik

GitHub/Linear/Figma'nın ayarlar pattern'i. Yatay sıkışma tamamen ortadan kalkar çünkü navigasyon dikey akar.

### Layout

```
┌────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌──────────────────────┐   │
│  │ AYARLAR      │  │ Profil Bilgileri     │   │
│  │              │  │ ──────────────────   │   │
│  │ 👤 Profil  ← │  │                      │   │
│  │ 🔒 Şifre     │  │ [Avatar 80px]        │   │
│  │ 🎨 Tema      │  │                      │   │
│  │ 🔔 Bildirim  │  │ Ad:    [_________]   │   │
│  │ 🌐 Dil       │  │ Soyad: [_________]   │   │
│  │ 🛡️ Güvenlik  │  │ Email: readonly      │   │
│  │ 💾 Veri      │  │                      │   │
│  │              │  │          [Kaydet ▶]  │   │
│  └──────────────┘  └──────────────────────┘   │
└────────────────────────────────────────────────┘
```

### Sol Navigasyon

- Sabit `240px` genişlik, `var(--card)` arka plan, `rounded-xl`, `1px solid var(--border)`
- Üstte küçük "AYARLAR" başlığı (`text-xs uppercase tracking-[0.2em]`, muted)
- 7 nav item, her biri:
  - `px-4 py-3`, `rounded-lg`, 16px icon + 14px label (`font-medium`)
  - Pasif: `text-secondary`, hover'da `text` + `var(--bg)` background
  - Aktif: `bg-[rgba(0,212,126,0.1)]`, `text-[#00D47E]`, sol kenarda 3px `#00D47E` solid bar (`::before` yerine absolute div)
- Motion: hover'da item `x: 2` slide, spring

### Sağ İçerik Alanı

- `flex-1`, `min-w-0`, `max-w-[680px]`, kendi iç padding'i `p-8`
- `var(--card)` arka plan, `rounded-xl`, `1px solid var(--border)`
- Her bölüm üstte `h2` başlık + `p` kısa açıklama, altta ayırıcı çizgi, sonra form içerik
- Butonlar her zaman alt sağda, section sınırları içinde, kesilmez
- Section değişiminde: sadece `opacity` fade (8px `y` shift, 180ms) — slide yok, daha oturaklı

### Responsive (`md:` altında)

- Container `flex-col` olur
- Sol nav: `w-full`, yatay scrollable row (`overflow-x-auto flex gap-2`)
- Her nav item pill olur, aktif olanın sol bar'ı alt bar'a dönüşür
- Sağ içerik altta tam genişlik

## Bölüm İçerikleri (değişmeyen — mevcut davranış korunur)

### 1. Profil
- 80px avatar (gradient bg, initials), sağında Ad/Soyad inputları, altında readonly e-posta
- Supabase `updateUser({ data: { first_name, last_name } })`
- "Kaydet" butonu sağ altta

### 2. Şifre
- 2 input (yeni şifre, tekrar), eye toggle
- 5-bar şifre gücü indicator (zayıf/orta/güçlü renk geçişi)
- Supabase `updateUser({ password })`
- "Şifreyi Güncelle" butonu sağ altta

### 3. Tema
- 2 kart yan yana (Açık/Koyu), her biri mini UI preview
- Seçili kart border `#00D47E`, `ring-2`
- `useTheme()` — seçim anında uygulanır, kayıt butonu yok

### 4. Bildirimler
- 3 toggle satırı (E-posta, Kira hatırlatması, Gecikme)
- Her satır: icon + label + description + switch (spring anim)
- `localStorage: kiraciyonet-notif`

### 5. Dil
- 2 kart (Türkçe 🇹🇷, English 🇬🇧)
- `localStorage: kiraciyonet-lang`

### 6. Güvenlik
- 2FA kartı — "Yakında" badge ile disabled
- Son giriş tarihi bilgi satırı

### 7. Veri Yönetimi
- "Dışa Aktar" ghost butonu
- "Hesabı Sil" danger butonu + onay modalı (backdrop blur)

## Tasarım Sistemi Uyumu

- Renkler: `#025864` primary, `#00D47E` accent, `var(--card)`, `var(--border)`, `var(--text)` (dark mode uyumlu)
- Font: Plus Jakarta Sans (zaten global)
- Input: `bg-[var(--bg)]`, `border-[1.5px] border-[var(--border)]`, focus'ta `border-[#00D47E]` + `ring-[3px] ring-[rgba(0,212,126,0.15)]`, `rounded-lg`
- Primary buton: solid `#00D47E` bg, `#03363D` text, `font-semibold`, hover `scale-[1.02]`
- Ghost buton: `bg-[var(--bg)]` + border
- Danger buton: `bg-[var(--red-bg)]` + `text-[var(--red-text)]`
- Icon: Lucide React, 16-18px ölçüler

## Animasyon Stratejisi

- Sayfa ilk açılışta: nav soldan slide-in (`x: -12 → 0`), içerik fade-in
- Section değişiminde: `AnimatePresence mode="wait"` + fade (180ms)
- Nav item hover: `x: 2`, spring
- Toggle: x position spring
- Scale hover sadece primary buton ve modal kartlarında, başka yerde yok

## Doğrulama Checklist

1. `npm run dev` — `/settings` açılır, layout bozulmaz
2. Nav'da 7 item görünür, aktif olan sol yeşil bar + açık yeşil bg
3. Her nav item'a tıklayınca içerik fade ile değişir
4. Profil kaydet, şifre değiştir, tema değiştir çalışır
5. Butonlar hiçbir ekran genişliğinde kesilmez
6. Mobil (`< 768px`): nav üstte yatay row olur, içerik altta
7. Dark mode: tüm bölümler CSS değişkenlerine uyar, kontrast bozulmaz
8. `npm run build` hatasız

## Kapsam Dışı

- 2FA'nın gerçek implementasyonu (badge olarak kalır)
- i18n altyapısı (sadece localStorage'a kayıt)
- Hesap silme backend akışı (modal + Supabase `admin.deleteUser` çağrısı yok, sadece UI)
