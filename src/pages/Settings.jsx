/* ── KiraciYonet — Ayarlar Sayfası ── */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import {
  User, Lock, Palette, Bell, Globe, ShieldCheck, Database,
  Save, Loader2, Check, AlertTriangle, Sun, Moon, ChevronRight,
  Mail, BellRing, Clock, Download, Trash2
} from 'lucide-react'

/* ── Section Nav Items ── */
const SECTIONS = [
  { id: 'profil', label: 'Profil', icon: User },
  { id: 'sifre', label: 'Şifre', icon: Lock },
  { id: 'tema', label: 'Tema', icon: Palette },
  { id: 'bildirim', label: 'Bildirimler', icon: Bell },
  { id: 'dil', label: 'Dil', icon: Globe },
  { id: 'guvenlik', label: 'Güvenlik', icon: ShieldCheck },
  { id: 'veri', label: 'Veri Yönetimi', icon: Database },
]

/* ── Toggle Switch ── */
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        ${checked ? 'bg-[#00D47E]' : 'bg-[var(--border)]'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full
          bg-white shadow-lg ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  )
}

/* ── Section Card Wrapper ── */
function SectionCard({ id, icon: Icon, title, description, children, delay = 0 }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl"
          style={{ background: 'var(--primary-bg)' }}
        >
          <Icon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--text)' }}>{title}</h3>
          {description && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
          )}
        </div>
      </div>
      <div className="px-6 py-5">
        {children}
      </div>
    </motion.section>
  )
}

/* ── Form Input ── */
function FormInput({ label, type = 'text', value, onChange, placeholder, disabled, id }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 rounded-xl text-sm font-medium
          border outline-none transition-all duration-200
          placeholder:opacity-40
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-[var(--primary)]/30'}
        `}
        style={{
          background: disabled ? 'var(--bg)' : 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = '#00D47E' }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
      />
    </div>
  )
}

/* ── Action Button ── */
function ActionBtn({ children, onClick, loading, variant = 'primary', icon: Icon }) {
  const styles = {
    primary: {
      background: 'linear-gradient(135deg, #025864, #03768A)',
      color: '#fff',
    },
    accent: {
      background: '#00D47E',
      color: '#03363D',
    },
    danger: {
      background: 'var(--red-bg)',
      color: 'var(--red-text)',
      border: '1px solid var(--red)',
    },
    ghost: {
      background: 'var(--bg)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border)',
    }
  }

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-shadow duration-200 hover:shadow-lg disabled:opacity-60"
      style={styles[variant]}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon && <Icon className="w-4 h-4" />}
      {children}
    </motion.button>
  )
}

/* ══════════════════════════════════════════ */
/* ══ Main Settings Page                  ══ */
/* ══════════════════════════════════════════ */
export default function Settings() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const { showToast } = useToast()

  /* ── Scroll spy ── */
  const [activeSection, setActiveSection] = useState('profil')
  const scrollRef = useRef(null)

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleScroll = () => {
      const sections = SECTIONS.map(s => ({
        id: s.id,
        el: document.getElementById(s.id),
      })).filter(s => s.el)

      const containerTop = container.scrollTop + 120
      let current = sections[0]?.id || 'profil'

      for (const s of sections) {
        if (s.el.offsetTop - container.offsetTop <= containerTop) {
          current = s.id
        }
      }
      setActiveSection(current)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /* ── Profile state ── */
  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || '')
  const [lastName, setLastName] = useState(user?.user_metadata?.last_name || '')
  const [profileLoading, setProfileLoading] = useState(false)

  const handleSaveProfile = async () => {
    setProfileLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { first_name: firstName, last_name: lastName }
      })
      if (error) throw error
      showToast('Profil güncellendi.', 'success')
    } catch (err) {
      showToast('Hata: ' + err.message, 'error')
    } finally {
      setProfileLoading(false)
    }
  }

  /* ── Password state ── */
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      showToast('Şifre en az 6 karakter olmalı.', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('Şifreler eşleşmiyor.', 'error')
      return
    }
    setPasswordLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword('')
      setConfirmPassword('')
      showToast('Şifre güncellendi.', 'success')
    } catch (err) {
      showToast('Hata: ' + err.message, 'error')
    } finally {
      setPasswordLoading(false)
    }
  }

  /* ── Notification prefs ── */
  const [notifPrefs, setNotifPrefs] = useState(() => {
    const saved = localStorage.getItem('kiraciyonet-notif')
    return saved ? JSON.parse(saved) : { email: true, rent: true, overdue: true }
  })

  const updateNotif = (key, val) => {
    const next = { ...notifPrefs, [key]: val }
    setNotifPrefs(next)
    localStorage.setItem('kiraciyonet-notif', JSON.stringify(next))
  }

  /* ── Language ── */
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('kiraciyonet-lang') || 'tr'
  })

  const handleLangChange = (lang) => {
    setLanguage(lang)
    localStorage.setItem('kiraciyonet-lang', lang)
    showToast(lang === 'tr' ? 'Dil: Türkçe' : 'Language: English', 'success')
  }

  /* ── Delete confirm ── */
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  /* ── Initials for avatar ── */
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map(n => n[0]?.toUpperCase())
    .join('') || user?.email?.[0]?.toUpperCase() || '?'

  return (
    <div className="flex gap-0 h-[calc(100vh-60px)] overflow-hidden -mx-6 -mt-6"
      style={{ background: 'var(--bg)' }}
    >
      {/* ── Left Nav ── */}
      <motion.nav
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="hidden lg:flex flex-col w-[240px] shrink-0 border-r py-6 px-3"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="px-3 mb-6">
          <h2 className="text-lg font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
            Ayarlar
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Hesap ve uygulama tercihleri
          </p>
        </div>

        <div className="space-y-0.5">
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id
            return (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                  text-sm font-medium transition-all duration-200 text-left
                  ${isActive ? 'font-semibold' : 'hover:opacity-80'}
                `}
                style={{
                  background: isActive ? 'var(--primary-bg)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />
                )}
              </button>
            )
          })}
        </div>
      </motion.nav>

      {/* ── Main Content ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 space-y-6"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="max-w-[680px] mx-auto space-y-6">

          {/* ═══ 1. PROFIL ═══ */}
          <SectionCard
            id="profil"
            icon={User}
            title="Profil Bilgileri"
            description="Hesap bilgilerinizi yönetin"
            delay={0.05}
          >
            {/* Avatar + Email */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #025864, #00D47E)' }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                  {firstName && lastName ? `${firstName} ${lastName}` : user?.email}
                </p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                id="firstName"
                label="Ad"
                value={firstName}
                onChange={setFirstName}
                placeholder="Adınız"
              />
              <FormInput
                id="lastName"
                label="Soyad"
                value={lastName}
                onChange={setLastName}
                placeholder="Soyadınız"
              />
            </div>
            <div className="mt-4">
              <FormInput
                id="email"
                label="E-posta"
                value={user?.email || ''}
                onChange={() => {}}
                disabled
              />
            </div>
            <div className="mt-5 flex justify-end">
              <ActionBtn onClick={handleSaveProfile} loading={profileLoading} icon={Save}>
                Kaydet
              </ActionBtn>
            </div>
          </SectionCard>

          {/* ═══ 2. ŞİFRE ═══ */}
          <SectionCard
            id="sifre"
            icon={Lock}
            title="Şifre Değiştir"
            description="Hesap güvenliğiniz için şifrenizi güncelleyin"
            delay={0.1}
          >
            <div className="space-y-4">
              <FormInput
                id="newPassword"
                label="Yeni Şifre"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="En az 6 karakter"
              />
              <FormInput
                id="confirmPassword"
                label="Yeni Şifre (Tekrar)"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Şifrenizi tekrar girin"
              />
            </div>
            <div className="mt-5 flex justify-end">
              <ActionBtn onClick={handleChangePassword} loading={passwordLoading} icon={Lock}>
                Şifreyi Güncelle
              </ActionBtn>
            </div>
          </SectionCard>

          {/* ═══ 3. TEMA ═══ */}
          <SectionCard
            id="tema"
            icon={Palette}
            title="Tema"
            description="Uygulama görünümünü kişiselleştirin"
            delay={0.15}
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Light */}
              <button
                onClick={() => setTheme('light')}
                className={`
                  relative rounded-2xl border-2 p-4 transition-all duration-200
                  ${theme === 'light' ? 'border-[#00D47E] shadow-md' : 'hover:border-[var(--text-muted)]'}
                `}
                style={{
                  borderColor: theme === 'light' ? '#00D47E' : 'var(--border)',
                  background: 'var(--card)',
                }}
              >
                {theme === 'light' && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#00D47E] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                {/* Mini preview */}
                <div className="w-full aspect-[4/3] rounded-lg overflow-hidden mb-3 border" style={{ borderColor: '#E2E5EB' }}>
                  <div className="h-full bg-[#F0F2F5] p-2">
                    <div className="h-2 w-12 rounded-full bg-[#025864] mb-1.5" />
                    <div className="h-1.5 w-20 rounded-full bg-[#E2E5EB] mb-1" />
                    <div className="h-1.5 w-16 rounded-full bg-[#E2E5EB]" />
                    <div className="mt-2 h-6 rounded bg-white border border-[#E2E5EB]" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4" style={{ color: theme === 'light' ? '#025864' : 'var(--text-muted)' }} />
                  <span className="text-sm font-semibold" style={{ color: theme === 'light' ? 'var(--text)' : 'var(--text-muted)' }}>
                    Açık Tema
                  </span>
                </div>
              </button>

              {/* Dark */}
              <button
                onClick={() => setTheme('dark')}
                className={`
                  relative rounded-2xl border-2 p-4 transition-all duration-200
                  ${theme === 'dark' ? 'border-[#00D47E] shadow-md' : 'hover:border-[var(--text-muted)]'}
                `}
                style={{
                  borderColor: theme === 'dark' ? '#00D47E' : 'var(--border)',
                  background: 'var(--card)',
                }}
              >
                {theme === 'dark' && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#00D47E] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="w-full aspect-[4/3] rounded-lg overflow-hidden mb-3 border border-[#2D3748]">
                  <div className="h-full bg-[#0F1419] p-2">
                    <div className="h-2 w-12 rounded-full bg-[#5EEAD4] mb-1.5" />
                    <div className="h-1.5 w-20 rounded-full bg-[#2D3748] mb-1" />
                    <div className="h-1.5 w-16 rounded-full bg-[#2D3748]" />
                    <div className="mt-2 h-6 rounded bg-[#1A2332] border border-[#2D3748]" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4" style={{ color: theme === 'dark' ? 'var(--text)' : 'var(--text-muted)' }} />
                  <span className="text-sm font-semibold" style={{ color: theme === 'dark' ? 'var(--text)' : 'var(--text-muted)' }}>
                    Koyu Tema
                  </span>
                </div>
              </button>
            </div>
          </SectionCard>

          {/* ═══ 4. BİLDİRİMLER ═══ */}
          <SectionCard
            id="bildirim"
            icon={Bell}
            title="Bildirim Tercihleri"
            description="Hangi bildirimleri almak istediğinizi seçin"
            delay={0.2}
          >
            <div className="space-y-0 divide-y" style={{ borderColor: 'var(--border)' }}>
              {[
                { key: 'email', icon: Mail, label: 'E-posta Bildirimleri', desc: 'Genel bilgilendirme e-postaları' },
                { key: 'rent', icon: BellRing, label: 'Kira Hatırlatmaları', desc: 'Kira ödeme tarihlerinde hatırlatma' },
                { key: 'overdue', icon: Clock, label: 'Gecikme Uyarıları', desc: 'Geciken ödemeler için uyarı' },
              ].map(({ key, icon: NIcon, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-4" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <NIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                    </div>
                  </div>
                  <Toggle checked={notifPrefs[key]} onChange={v => updateNotif(key, v)} />
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ═══ 5. DİL ═══ */}
          <SectionCard
            id="dil"
            icon={Globe}
            title="Dil"
            description="Uygulama dilini seçin"
            delay={0.25}
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
                { code: 'en', label: 'English', flag: '🇬🇧' },
              ].map(({ code, label, flag }) => (
                <button
                  key={code}
                  onClick={() => handleLangChange(code)}
                  className={`
                    flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all duration-200
                    ${language === code ? 'border-[#00D47E] shadow-sm' : 'hover:border-[var(--text-muted)]'}
                  `}
                  style={{
                    borderColor: language === code ? '#00D47E' : 'var(--border)',
                    background: 'var(--card)',
                  }}
                >
                  <span className="text-xl">{flag}</span>
                  <span className="text-sm font-semibold" style={{ color: language === code ? 'var(--text)' : 'var(--text-secondary)' }}>
                    {label}
                  </span>
                  {language === code && (
                    <Check className="w-4 h-4 ml-auto text-[#00D47E]" />
                  )}
                </button>
              ))}
            </div>
          </SectionCard>

          {/* ═══ 6. GÜVENLİK ═══ */}
          <SectionCard
            id="guvenlik"
            icon={ShieldCheck}
            title="Güvenlik"
            description="Hesap güvenlik ayarları"
            delay={0.3}
          >
            {/* 2FA Status */}
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>İki Faktörlü Doğrulama (2FA)</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Ek güvenlik katmanı</p>
                </div>
              </div>
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: 'var(--amber-bg)', color: 'var(--amber-text)' }}
              >
                Yakında
              </span>
            </div>

            {/* Last login */}
            <div className="mt-4 flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
              <Clock className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Son Giriş</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text)' }}>
                  {user?.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleString('tr-TR')
                    : '—'
                  }
                </p>
              </div>
            </div>
          </SectionCard>

          {/* ═══ 7. VERİ YÖNETİMİ ═══ */}
          <SectionCard
            id="veri"
            icon={Database}
            title="Veri Yönetimi"
            description="Verilerinizi dışa aktarın veya hesabınızı silin"
            delay={0.35}
          >
            <div className="space-y-4">
              {/* Export */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
                <div className="flex items-center gap-3">
                  <Download className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Verilerimi Dışa Aktar</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Tüm verilerinizi JSON olarak indirin</p>
                  </div>
                </div>
                <ActionBtn variant="ghost" icon={Download} onClick={() => showToast('Bu özellik yakında aktif olacak.', 'info')}>
                  İndir
                </ActionBtn>
              </div>

              {/* Delete */}
              <div className="flex items-center justify-between p-4 rounded-xl border" style={{ background: 'var(--red-bg)', borderColor: 'var(--red)' }}>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4" style={{ color: 'var(--red-text)' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--red-text)' }}>Hesabımı Sil</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--red-text)', opacity: 0.7 }}>Bu işlem geri alınamaz</p>
                  </div>
                </div>
                <ActionBtn variant="danger" icon={Trash2} onClick={() => setShowDeleteConfirm(true)}>
                  Sil
                </ActionBtn>
              </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AnimatePresence>
              {showDeleteConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    className="w-[400px] max-w-[90vw] rounded-2xl border p-6"
                    style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--red-bg)' }}>
                        <AlertTriangle className="w-5 h-5" style={{ color: 'var(--red)' }} />
                      </div>
                      <h4 className="text-base font-bold" style={{ color: 'var(--text)' }}>Hesabı Sil</h4>
                    </div>
                    <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                      Hesabınızı silmek istediğinize emin misiniz? Tüm verileriniz kalıcı olarak silinecektir. Bu işlem geri alınamaz.
                    </p>
                    <div className="flex justify-end gap-3">
                      <ActionBtn variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                        İptal
                      </ActionBtn>
                      <ActionBtn variant="danger" icon={Trash2} onClick={() => {
                        setShowDeleteConfirm(false)
                        showToast('Bu özellik yakında aktif olacak.', 'info')
                      }}>
                        Evet, Sil
                      </ActionBtn>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </SectionCard>

          {/* Bottom spacing */}
          <div className="h-8" />
        </div>
      </div>
    </div>
  )
}
