# AuthOverlay Redesign — Dark & Premium

## Context

Mevcut giriş/kayıt ekranı (AuthOverlay) legacy CSS ile yazılmış, görsel olarak sade bir tasarıma sahip. Kullanıcı, mevcut tasarımı referans almadan sıfırdan dark & premium estetikle yeniden tasarlanmasını talep etti. Aynı zamanda şifremi unuttum özelliği eklenmesi ve legacy CSS'in temizlenmesi hedefleniyor.

## Kararlar

- **Estetik:** Dark & Premium — koyu arka plan, glassmorphism kart
- **Arka plan:** Gradient Orbs — yavaşça hareket eden teal/yeşil blob'lar
- **Form yapısı:** Tab sistemi (Giriş Yap / Kayıt Ol) tek kart içinde
- **Ek özellik:** Şifremi unuttum akışı (Supabase `resetPasswordForEmail`)
- **Teknik:** Tailwind + Motion ile sıfırdan, legacy CSS silinir

## Genel Yapı

Tam ekran dark overlay (`fixed inset-0`). Ortada glassmorphism kart. Arka planda 3 animasyonlu gradient orb.

```
┌─────────────────────────────────────────────┐
│  ●●● gradient orbs (animated, bg)           │
│                                             │
│         ┌─────────────────────┐             │
│         │  Logo + KiraciYonet │             │
│         │  "Mülk Yönetim"    │             │
│         │                     │             │
│         │  [Giriş] [Kayıt]   │  ← tabs     │
│         │  ─────────────────  │             │
│         │  E-posta            │             │
│         │  Şifre              │             │
│         │  [Giriş Yap]       │             │
│         │  Şifremi unuttum?  │             │
│         └─────────────────────┘             │
│              glassmorphism card              │
└─────────────────────────────────────────────┘
```

## Arka Plan

- Ana zemin: `#080d19` → `#0d1520` → `#080d19` (135deg gradient)
- 3 orb: `radial-gradient` ile teal (`rgba(2,88,100,0.15)`) ve yeşil (`rgba(0,212,126,0.12)`)
- Orb'lar Motion `animate` ile yavaş x/y kayması (8-10s, infinite, ease-in-out)
- `blur-3xl` ile yumuşak kenarlar

## Glassmorphism Kart

- `bg-white/[0.04]` — çok hafif beyaz
- `border border-white/[0.08]`
- `backdrop-blur-xl`
- `rounded-2xl`
- `shadow-2xl shadow-black/30`
- Genişlik: `w-[420px] max-w-[92vw]`
- Motion giriş: `initial={{ opacity: 0, y: 30, scale: 0.97 }}` → `animate={{ opacity: 1, y: 0, scale: 1 }}`

## Header (Kart İçi)

- Logo: 56px kare, `bg-gradient-to-br from-[#025864] to-[#00D47E]`, rounded-xl, "K" harfi beyaz font-extrabold
- Başlık: "KiraciYonet" — `text-white text-2xl font-bold tracking-tight`
- Alt metin: "Mülk Yönetim Sistemi" — `text-white/40 text-xs tracking-[3px] uppercase`

## Tab Sistemi

- 2 tab: "Giriş Yap" / "Kayıt Ol"
- Aktif: `text-white border-b-2 border-[#00D47E]`
- Pasif: `text-white/40 hover:text-white/60`
- AnimatePresence ile tab değişiminde form fade in/out

## Form Alanları

- Input: `bg-white/[0.06] border border-white/[0.1] rounded-xl`
- Focus: `border-[#00D47E]/50 ring-2 ring-[#00D47E]/20`
- Label: `text-white/70 text-sm font-medium`
- Placeholder: `text-white/30`
- Text: `text-white`

## Butonlar

- Primary: `bg-gradient-to-r from-[#025864] to-[#00D47E]` + `shadow-lg shadow-[#00D47E]/25`
- Hover: Motion `scale: 1.02`, shadow artışı
- Tap: Motion `scale: 0.98`
- Loading: spinner animasyonu
- Disabled: `opacity-60`

## Şifremi Unuttum Akışı

- Giriş formunda "Şifremi unuttum?" linki — `text-white/50 hover:text-[#00D47E]`
- Tıklanınca AnimatePresence geçişi → sadece e-posta input + "Sıfırlama Linki Gönder" butonu
- Başarılı mesaj: yeşil kutu "Sıfırlama linki e-posta adresinize gönderildi"
- "Giriş ekranına dön" linki ile geri geçiş

## Mesajlar (Hata/Başarı)

- Hata: `bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl`
- Başarı: `bg-[#00D47E]/10 border border-[#00D47E]/20 text-[#00D47E] rounded-xl`
- AnimatePresence ile fade in/out

## Kayıt Formu Alanları

- E-posta
- Şifre
- Şifre onayı
- "Kayıt Ol" butonu (aynı gradient stili)

## Dosya Değişiklikleri

| Dosya | Değişiklik |
|-------|-----------|
| `src/components/AuthOverlay.jsx` | Tamamen yeniden yazılır — Tailwind + Motion |
| `src/context/AuthContext.jsx` | `resetPassword(email)` fonksiyonu eklenir |
| `src/index.css` | `.auth-*` legacy CSS kuralları silinir (~200 satır) |

## Mevcut Fonksiyonlar (Korunacak)

AuthContext'ten: `signIn(email, password)`, `signUp(email, password)`, `signOut()`, `user`, `loading`

Supabase hata mesajları Türkçe mapping'i mevcut koddan taşınacak.

## Verification

1. `npm run dev` → giriş ekranı açılır
2. Dark arka plan + animasyonlu orb'lar görünür
3. Glassmorphism kart ortada, logo + başlık
4. Tab ile Giriş/Kayıt geçişi çalışır
5. Form validation (boş alan, şifre eşleşme) çalışır
6. Şifremi unuttum akışı düzgün geçiş yapar
7. Giriş yapılınca dashboard'a yönlenir
8. `npm run build` — hatasız
