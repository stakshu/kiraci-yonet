/* ── KiraciYonet — Ayarlar Sayfası ── */
import { useState, useEffect } from 'react'
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

/* ── Nav items ── */
const NAV = [
  { id: 'profil', label: 'Profil', icon: User },
  { id: 'sifre', label: 'Şifre', icon: Lock },
  { id: 'tema', label: 'Tema', icon: Palette },
  { id: 'bildirim', label: 'Bildirimler', icon: Bell },
  { id: 'dil', label: 'Dil', icon: Globe },
  { id: 'guvenlik', label: 'Güvenlik', icon: ShieldCheck },
  { id: 'veri', label: 'Veri Yönetimi', icon: Database },
]

/* ═══════════════════════════════════════════ */
export default function Settings() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const { showToast } = useToast()

  /* ── Active section tracking ── */
  const [active, setActive] = useState('profil')

  useEffect(() => {
    const onScroll = () => {
      for (const s of [...NAV].reverse()) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= 180) {
          setActive(s.id)
          break
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => window.removeEventListener('scroll', onScroll, { capture: true })
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /* ── Profile ── */
  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || '')
  const [lastName, setLastName] = useState(user?.user_metadata?.last_name || '')
  const [profileLoading, setProfileLoading] = useState(false)

  const saveProfile = async () => {
    setProfileLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName } })
      if (error) throw error
      showToast('Profil güncellendi.', 'success')
    } catch (e) {
      showToast('Hata: ' + e.message, 'error')
    } finally {
      setProfileLoading(false)
    }
  }

  /* ── Password ── */
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  const changePassword = async () => {
    if (pw.length < 6) return showToast('Şifre en az 6 karakter olmalı.', 'error')
    if (pw !== pw2) return showToast('Şifreler eşleşmiyor.', 'error')
    setPwLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) throw error
      setPw(''); setPw2('')
      showToast('Şifre güncellendi.', 'success')
    } catch (e) {
      showToast('Hata: ' + e.message, 'error')
    } finally {
      setPwLoading(false)
    }
  }

  /* ── Notifications ── */
  const [notif, setNotif] = useState(() => {
    const s = localStorage.getItem('kiraciyonet-notif')
    return s ? JSON.parse(s) : { email: true, rent: true, overdue: true }
  })
  const toggleNotif = (k) => {
    const next = { ...notif, [k]: !notif[k] }
    setNotif(next)
    localStorage.setItem('kiraciyonet-notif', JSON.stringify(next))
  }

  /* ── Language ── */
  const [lang, setLang] = useState(() => localStorage.getItem('kiraciyonet-lang') || 'tr')
  const pickLang = (l) => {
    setLang(l)
    localStorage.setItem('kiraciyonet-lang', l)
    showToast(l === 'tr' ? 'Dil: Türkçe' : 'Language: English', 'success')
  }

  /* ── Delete confirm ── */
  const [delOpen, setDelOpen] = useState(false)

  /* ── Initials ── */
  const initials = [firstName, lastName].filter(Boolean).map(n => n[0]?.toUpperCase()).join('') || user?.email?.[0]?.toUpperCase() || '?'

  return (
    <div className="flex gap-8 max-w-[960px]">

      {/* ════ LEFT NAV ════ */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
        className="hidden lg:block w-[200px] shrink-0"
      >
        <div
          className="sticky top-[84px] rounded-2xl p-3 space-y-0.5"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 text-left"
              style={{
                background: active === id ? 'var(--primary-bg)' : 'transparent',
                color: active === id ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: active === id ? 600 : 500,
              }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {active === id && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ════ SECTIONS ════ */}
      <div className="flex-1 min-w-0 space-y-5 pb-12">

        {/* ─── Profil ─── */}
        <Card id="profil" icon={User} title="Profil Bilgileri" desc="Hesap bilgilerinizi yönetin" i={0}>
          <div className="flex items-center gap-4 mb-5 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #025864, #00D47E)' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                {firstName && lastName ? `${firstName} ${lastName}` : user?.email}
              </p>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="fn" label="Ad" value={firstName} onChange={setFirstName} placeholder="Adınız" />
            <Input id="ln" label="Soyad" value={lastName} onChange={setLastName} placeholder="Soyadınız" />
          </div>
          <div className="mt-4">
            <Input id="em" label="E-posta" value={user?.email || ''} onChange={() => {}} disabled />
          </div>
          <div className="mt-5 flex justify-end">
            <Btn onClick={saveProfile} loading={profileLoading} icon={Save}>Kaydet</Btn>
          </div>
        </Card>

        {/* ─── Şifre ─── */}
        <Card id="sifre" icon={Lock} title="Şifre Değiştir" desc="Hesap güvenliğiniz için şifrenizi güncelleyin" i={1}>
          <div className="space-y-4">
            <Input id="pw1" label="Yeni Şifre" type="password" value={pw} onChange={setPw} placeholder="En az 6 karakter" />
            <Input id="pw2" label="Yeni Şifre (Tekrar)" type="password" value={pw2} onChange={setPw2} placeholder="Şifrenizi tekrar girin" />
          </div>
          <div className="mt-5 flex justify-end">
            <Btn onClick={changePassword} loading={pwLoading} icon={Lock}>Şifreyi Güncelle</Btn>
          </div>
        </Card>

        {/* ─── Tema ─── */}
        <Card id="tema" icon={Palette} title="Tema" desc="Uygulama görünümünü kişiselleştirin" i={2}>
          <div className="grid grid-cols-2 gap-4">
            <ThemeOption
              active={theme === 'light'}
              onClick={() => setTheme('light')}
              icon={Sun}
              label="Açık Tema"
              previewBg="#F0F2F5"
              previewBar="#025864"
              previewLine="#E2E5EB"
              previewCard="#FFFFFF"
              previewBorder="#E2E5EB"
            />
            <ThemeOption
              active={theme === 'dark'}
              onClick={() => setTheme('dark')}
              icon={Moon}
              label="Koyu Tema"
              previewBg="#0F1419"
              previewBar="#5EEAD4"
              previewLine="#2D3748"
              previewCard="#1A2332"
              previewBorder="#2D3748"
            />
          </div>
        </Card>

        {/* ─── Bildirimler ─── */}
        <Card id="bildirim" icon={Bell} title="Bildirim Tercihleri" desc="Hangi bildirimleri almak istediğinizi seçin" i={3}>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {[
              { k: 'email', icon: Mail, label: 'E-posta Bildirimleri', desc: 'Genel bilgilendirme e-postaları' },
              { k: 'rent', icon: BellRing, label: 'Kira Hatırlatmaları', desc: 'Kira ödeme tarihlerinde hatırlatma' },
              { k: 'overdue', icon: Clock, label: 'Gecikme Uyarıları', desc: 'Geciken ödemeler için uyarı' },
            ].map(({ k, icon: I, label, desc }) => (
              <div key={k} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <I className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                  </div>
                </div>
                <Toggle on={notif[k]} onToggle={() => toggleNotif(k)} />
              </div>
            ))}
          </div>
        </Card>

        {/* ─── Dil ─── */}
        <Card id="dil" icon={Globe} title="Dil" desc="Uygulama dilini seçin" i={4}>
          <div className="grid grid-cols-2 gap-3">
            {[{ c: 'tr', l: 'Türkçe', f: '🇹🇷' }, { c: 'en', l: 'English', f: '🇬🇧' }].map(({ c, l, f }) => (
              <button
                key={c}
                onClick={() => pickLang(c)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200"
                style={{
                  border: `2px solid ${lang === c ? '#00D47E' : 'var(--border)'}`,
                  background: 'var(--card)',
                }}
              >
                <span className="text-xl">{f}</span>
                <span className="text-sm font-semibold" style={{ color: lang === c ? 'var(--text)' : 'var(--text-secondary)' }}>{l}</span>
                {lang === c && <Check className="w-4 h-4 ml-auto text-[#00D47E]" />}
              </button>
            ))}
          </div>
        </Card>

        {/* ─── Güvenlik ─── */}
        <Card id="guvenlik" icon={ShieldCheck} title="Güvenlik" desc="Hesap güvenlik ayarları" i={5}>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>İki Faktörlü Doğrulama (2FA)</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Ek güvenlik katmanı</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--amber-bg)', color: 'var(--amber-text)' }}>
                Yakında
              </span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
              <Clock className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Son Giriş</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text)' }}>
                  {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('tr-TR') : '—'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* ─── Veri Yönetimi ─── */}
        <Card id="veri" icon={Database} title="Veri Yönetimi" desc="Verilerinizi dışa aktarın veya hesabınızı silin" i={6}>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
              <div className="flex items-center gap-3">
                <Download className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Verilerimi Dışa Aktar</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Tüm verilerinizi JSON olarak indirin</p>
                </div>
              </div>
              <Btn variant="ghost" icon={Download} onClick={() => showToast('Bu özellik yakında aktif olacak.', 'info')}>İndir</Btn>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--red-bg)', border: '1px solid var(--red)' }}>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4" style={{ color: 'var(--red-text)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--red-text)' }}>Hesabımı Sil</p>
                  <p className="text-xs mt-0.5 opacity-70" style={{ color: 'var(--red-text)' }}>Bu işlem geri alınamaz</p>
                </div>
              </div>
              <Btn variant="danger" icon={Trash2} onClick={() => setDelOpen(true)}>Sil</Btn>
            </div>
          </div>

          {/* Delete confirmation modal */}
          <AnimatePresence>
            {delOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                onClick={() => setDelOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={e => e.stopPropagation()}
                  className="w-[400px] max-w-[90vw] rounded-2xl p-6"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
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
                    <Btn variant="ghost" onClick={() => setDelOpen(false)}>İptal</Btn>
                    <Btn variant="danger" icon={Trash2} onClick={() => { setDelOpen(false); showToast('Bu özellik yakında aktif olacak.', 'info') }}>
                      Evet, Sil
                    </Btn>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════ */
/* ══ Sub-components                          ══ */
/* ══════════════════════════════════════════════ */

function Card({ id, icon: Icon, title, desc, children, i = 0 }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: 'var(--primary-bg)' }}>
          <Icon className="w-[18px] h-[18px]" style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <h3 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>{title}</h3>
          {desc && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </motion.section>
  )
}

function Input({ id, label, type = 'text', value, onChange, placeholder, disabled }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none transition-all duration-200 placeholder:opacity-40"
        style={{
          background: disabled ? 'var(--bg)' : 'var(--card)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = '#00D47E' }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
      />
    </div>
  )
}

function Toggle({ on, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200"
      style={{ background: on ? '#00D47E' : 'var(--border)' }}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200"
        style={{ transform: `translateX(${on ? '20px' : '2px'}) translateY(2px)` }}
      />
    </button>
  )
}

function ThemeOption({ active, onClick, icon: Icon, label, previewBg, previewBar, previewLine, previewCard, previewBorder }) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-2xl p-4 transition-all duration-200 text-left"
      style={{
        border: `2px solid ${active ? '#00D47E' : 'var(--border)'}`,
        background: 'var(--card)',
      }}
    >
      {active && (
        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#00D47E] flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      <div className="w-full aspect-[4/3] rounded-lg overflow-hidden mb-3" style={{ border: `1px solid ${previewBorder}` }}>
        <div className="h-full p-2" style={{ background: previewBg }}>
          <div className="h-2 w-12 rounded-full mb-1.5" style={{ background: previewBar }} />
          <div className="h-1.5 w-20 rounded-full mb-1" style={{ background: previewLine }} />
          <div className="h-1.5 w-16 rounded-full" style={{ background: previewLine }} />
          <div className="mt-2 h-6 rounded" style={{ background: previewCard, border: `1px solid ${previewBorder}` }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: active ? 'var(--primary)' : 'var(--text-muted)' }} />
        <span className="text-sm font-semibold" style={{ color: active ? 'var(--text)' : 'var(--text-muted)' }}>{label}</span>
      </div>
    </button>
  )
}

function Btn({ children, onClick, loading, variant = 'primary', icon: Icon }) {
  const s = {
    primary: { background: 'linear-gradient(135deg, #025864, #03768A)', color: '#fff' },
    accent: { background: '#00D47E', color: '#03363D' },
    danger: { background: 'var(--red-bg)', color: 'var(--red-text)', border: '1px solid var(--red)' },
    ghost: { background: 'var(--bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
  }
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-shadow duration-200 hover:shadow-md disabled:opacity-60 cursor-pointer"
      style={s[variant]}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon && <Icon className="w-4 h-4" />}
      {children}
    </motion.button>
  )
}
