/* ── KiraciYonet — Ayarlar — Sol Dikey Navigasyon ── */
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import {
  User, Lock, Palette, Bell, Globe, ShieldCheck, Database,
  Save, Loader2, Check, AlertTriangle, Sun, Moon,
  Mail, BellRing, Clock, Download, Trash2, Eye, EyeOff
} from 'lucide-react'

const NAV = [
  { id: 'profil',   label: 'Profil',     icon: User },
  { id: 'sifre',    label: 'Sifre',      icon: Lock },
  { id: 'tema',     label: 'Tema',       icon: Palette },
  { id: 'bildirim', label: 'Bildirimler',icon: Bell },
  { id: 'dil',      label: 'Dil',        icon: Globe },
  { id: 'guvenlik', label: 'Guvenlik',   icon: ShieldCheck },
  { id: 'veri',     label: 'Veri',       icon: Database },
]

export default function Settings() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const { showToast } = useToast()
  const [section, setSection] = useState('profil')

  /* ── Profile ── */
  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || '')
  const [lastName, setLastName] = useState(user?.user_metadata?.last_name || '')
  const [profileLoading, setProfileLoading] = useState(false)

  const saveProfile = async () => {
    setProfileLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName } })
      if (error) throw error
      showToast('Profil guncellendi.', 'success')
    } catch (e) { showToast('Hata: ' + e.message, 'error') }
    finally { setProfileLoading(false) }
  }

  /* ── Password ── */
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  const pwStrength = useMemo(() => {
    if (!pw) return { level: 0, label: '', color: 'var(--border)' }
    let score = 0
    if (pw.length >= 6) score++
    if (pw.length >= 10) score++
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
    if (/\d/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    if (score <= 2) return { level: score, label: 'Zayif', color: 'var(--red)' }
    if (score <= 3) return { level: score, label: 'Orta',  color: 'var(--amber)' }
    return { level: score, label: 'Guclu', color: '#00D47E' }
  }, [pw])

  const changePassword = async () => {
    if (pw.length < 6) return showToast('Sifre en az 6 karakter olmali.', 'error')
    if (pw !== pw2)     return showToast('Sifreler eslesmiyor.', 'error')
    setPwLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) throw error
      setPw(''); setPw2('')
      showToast('Sifre guncellendi.', 'success')
    } catch (e) { showToast('Hata: ' + e.message, 'error') }
    finally { setPwLoading(false) }
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
  const pickLang = (l) => { setLang(l); localStorage.setItem('kiraciyonet-lang', l) }

  /* ── Delete ── */
  const [delOpen, setDelOpen] = useState(false)

  const initials = [firstName, lastName].filter(Boolean).map(n => n[0]?.toUpperCase()).join('')
    || user?.email?.[0]?.toUpperCase() || '?'

  return (
    <div className="w-full flex flex-col md:flex-row gap-5">

      {/* ════ LEFT NAV ════ */}
      <motion.aside
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
        className="md:w-[240px] md:shrink-0"
      >
        <div
          className="rounded-2xl p-3"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p
            className="px-3 pt-2 pb-3 text-[10px] font-bold uppercase tracking-[0.2em] hidden md:block"
            style={{ color: 'var(--text-muted)' }}
          >
            Ayarlar
          </p>

          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible scrollbar-hide">
            {NAV.map(({ id, label, icon: Icon }) => {
              const active = section === id
              return (
                <motion.button
                  key={id}
                  onClick={() => setSection(id)}
                  whileHover={{ x: active ? 0 : 2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold shrink-0 md:shrink cursor-pointer transition-colors duration-150"
                  style={{
                    background: active ? 'rgba(0,212,126,0.1)' : 'transparent',
                    color: active ? '#00D47E' : 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg)' }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full hidden md:block"
                      style={{ background: '#00D47E' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{label}</span>
                </motion.button>
              )
            })}
          </nav>
        </div>
      </motion.aside>

      {/* ════ RIGHT CONTENT ════ */}
      <div className="flex-1 min-w-0">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-2xl"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="p-6 md:p-8 max-w-[680px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >

                {/* ─── PROFIL ─── */}
                {section === 'profil' && (
                  <>
                    <SectionHeader title="Profil Bilgileri" desc="Hesap bilgilerinizi yonetin" />
                    <div className="flex flex-col sm:flex-row gap-6 mt-6">
                      <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white shrink-0 self-start"
                        style={{ background: 'linear-gradient(135deg, #025864, #00D47E)' }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field id="fn" label="Ad" value={firstName} onChange={setFirstName} placeholder="Adiniz" />
                          <Field id="ln" label="Soyad" value={lastName} onChange={setLastName} placeholder="Soyadiniz" />
                        </div>
                        <Field id="em" label="E-posta" value={user?.email || ''} onChange={() => {}} disabled />
                      </div>
                    </div>
                    <div className="mt-8 pt-5 flex justify-end" style={{ borderTop: '1px solid var(--border)' }}>
                      <Btn onClick={saveProfile} loading={profileLoading} icon={Save}>Kaydet</Btn>
                    </div>
                  </>
                )}

                {/* ─── SIFRE ─── */}
                {section === 'sifre' && (
                  <>
                    <SectionHeader title="Sifre Degistir" desc="Hesap guvenliginiz icin sifrenizi guncelleyin" />
                    <div className="mt-6 space-y-4 max-w-md">
                      <div className="relative">
                        <Field
                          id="pw1"
                          label="Yeni Sifre"
                          type={showPw ? 'text' : 'password'}
                          value={pw}
                          onChange={setPw}
                          placeholder="En az 6 karakter"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-[34px] p-1 cursor-pointer"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {pw && (
                        <div className="space-y-1.5">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(i => (
                              <div
                                key={i}
                                className="h-1 flex-1 rounded-full transition-colors duration-300"
                                style={{ background: i <= pwStrength.level ? pwStrength.color : 'var(--border)' }}
                              />
                            ))}
                          </div>
                          <p className="text-[11px] font-semibold" style={{ color: pwStrength.color }}>
                            {pwStrength.label}
                          </p>
                        </div>
                      )}

                      <Field
                        id="pw2"
                        label="Sifre Tekrar"
                        type="password"
                        value={pw2}
                        onChange={setPw2}
                        placeholder="Sifrenizi tekrar girin"
                      />
                    </div>
                    <div className="mt-8 pt-5 flex justify-end" style={{ borderTop: '1px solid var(--border)' }}>
                      <Btn onClick={changePassword} loading={pwLoading} icon={Lock}>Sifreyi Guncelle</Btn>
                    </div>
                  </>
                )}

                {/* ─── TEMA ─── */}
                {section === 'tema' && (
                  <>
                    <SectionHeader title="Tema" desc="Uygulama gorunumunu kisisellestirin" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                      <ThemeCard
                        active={theme === 'light'}
                        onClick={() => setTheme('light')}
                        icon={Sun}
                        label="Acik Tema"
                        bg="#F0F2F5" bar="#025864" line="#E2E5EB" card="#FFFFFF" bdr="#E2E5EB"
                      />
                      <ThemeCard
                        active={theme === 'dark'}
                        onClick={() => setTheme('dark')}
                        icon={Moon}
                        label="Koyu Tema"
                        bg="#0F1419" bar="#5EEAD4" line="#2D3748" card="#1A2332" bdr="#2D3748"
                      />
                    </div>
                  </>
                )}

                {/* ─── BILDIRIMLER ─── */}
                {section === 'bildirim' && (
                  <>
                    <SectionHeader title="Bildirim Tercihleri" desc="Hangi bildirimleri almak istediginizi secin" />
                    <div className="mt-6 divide-y" style={{ borderColor: 'var(--border)' }}>
                      <NotifRow icon={Mail}     label="E-posta Bildirimleri" desc="Genel bilgilendirme e-postalari" on={notif.email}   toggle={() => toggleNotif('email')} />
                      <NotifRow icon={BellRing} label="Kira Hatirlatmalari"  desc="Kira odeme tarihlerinde hatirlatma" on={notif.rent}  toggle={() => toggleNotif('rent')} />
                      <NotifRow icon={Clock}    label="Gecikme Uyarilari"    desc="Geciken odemeler icin uyari"      on={notif.overdue} toggle={() => toggleNotif('overdue')} />
                    </div>
                  </>
                )}

                {/* ─── DIL ─── */}
                {section === 'dil' && (
                  <>
                    <SectionHeader title="Dil" desc="Uygulama dilini secin" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                      <LangCard label="Turkce"  flag="🇹🇷" active={lang === 'tr'} onClick={() => pickLang('tr')} />
                      <LangCard label="English" flag="🇬🇧" active={lang === 'en'} onClick={() => pickLang('en')} />
                    </div>
                  </>
                )}

                {/* ─── GUVENLIK ─── */}
                {section === 'guvenlik' && (
                  <>
                    <SectionHeader title="Guvenlik" desc="Hesap guvenlik ayarlari" />
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <ShieldCheck className="w-5 h-5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>Iki Faktorlu Dogrulama</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Ek guvenlik katmani</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ml-2" style={{ background: 'var(--amber-bg)', color: 'var(--amber-text)' }}>
                          YAKINDA
                        </span>
                      </div>
                      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
                        <Clock className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Son Giris</p>
                          <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text)' }}>
                            {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('tr-TR') : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ─── VERI ─── */}
                {section === 'veri' && (
                  <>
                    <SectionHeader title="Veri Yonetimi" desc="Verilerinizi disa aktarin veya hesabinizi silin" />
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between gap-3 p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <Download className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>Verilerimi Disa Aktar</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Tum verilerinizi JSON olarak indirin</p>
                          </div>
                        </div>
                        <Btn variant="ghost" icon={Download} onClick={() => showToast('Bu ozellik yakinda aktif olacak.', 'info')}>Indir</Btn>
                      </div>

                      <div className="flex items-center justify-between gap-3 p-4 rounded-xl" style={{ background: 'var(--red-bg)', border: '1px solid var(--red)' }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--red-text)' }} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--red-text)' }}>Hesabimi Sil</p>
                            <p className="text-xs mt-0.5 opacity-70" style={{ color: 'var(--red-text)' }}>Bu islem geri alinamaz</p>
                          </div>
                        </div>
                        <Btn variant="danger" icon={Trash2} onClick={() => setDelOpen(true)}>Sil</Btn>
                      </div>
                    </div>
                  </>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* ════ DELETE MODAL ════ */}
      <AnimatePresence>
        {delOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setDelOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-[400px] max-w-full rounded-2xl p-6"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--red-bg)' }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: 'var(--red)' }} />
                </div>
                <h4 className="text-base font-bold" style={{ color: 'var(--text)' }}>Hesabi Sil</h4>
              </div>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Hesabinizi silmek istediginize emin misiniz? Tum verileriniz kalici olarak silinecektir.
              </p>
              <div className="flex justify-end gap-3">
                <Btn variant="ghost" onClick={() => setDelOpen(false)}>Iptal</Btn>
                <Btn variant="danger" icon={Trash2} onClick={() => { setDelOpen(false); showToast('Bu ozellik yakinda aktif olacak.', 'info') }}>
                  Evet, Sil
                </Btn>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ══ Sub-Components ══ */

function SectionHeader({ title, desc }) {
  return (
    <div>
      <h2 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>{title}</h2>
      {desc && <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{desc}</p>}
    </div>
  )
}

function Field({ id, label, type = 'text', value, onChange, placeholder, disabled }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all duration-200 placeholder:opacity-30"
        style={{
          background: 'var(--bg)',
          border: '1.5px solid var(--border)',
          color: 'var(--text)',
          opacity: disabled ? 0.55 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
        onFocus={e => { if (!disabled) { e.target.style.borderColor = '#00D47E'; e.target.style.boxShadow = '0 0 0 3px rgba(0,212,126,0.15)' } }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
      />
    </div>
  )
}

function Toggle({ on, onToggle }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      className="relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer rounded-full p-[3px] transition-colors duration-200"
      style={{ background: on ? '#00D47E' : 'var(--border)' }}
      whileTap={{ scale: 0.92 }}
    >
      <motion.span
        className="block h-5 w-5 rounded-full bg-white shadow-md"
        animate={{ x: on ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  )
}

function NotifRow({ icon: Icon, label, desc, on, toggle }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
        </div>
      </div>
      <Toggle on={on} onToggle={toggle} />
    </div>
  )
}

function ThemeCard({ active, onClick, icon: Icon, label, bg, bar, line, card, bdr }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="relative rounded-2xl p-4 text-left transition-all duration-200 cursor-pointer"
      style={{ border: `2px solid ${active ? '#00D47E' : 'var(--border)'}`, background: 'var(--card)' }}
    >
      {active && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: '#00D47E' }}
        >
          <Check className="w-3 h-3 text-white" />
        </motion.div>
      )}
      <div className="w-full aspect-[5/3] rounded-xl overflow-hidden mb-3" style={{ border: `1px solid ${bdr}` }}>
        <div className="h-full p-2.5 flex flex-col gap-1.5" style={{ background: bg }}>
          <div className="h-2 w-14 rounded-full" style={{ background: bar }} />
          <div className="h-1.5 w-24 rounded-full" style={{ background: line }} />
          <div className="h-1.5 w-16 rounded-full" style={{ background: line }} />
          <div className="flex-1 mt-1 rounded-lg" style={{ background: card, border: `1px solid ${bdr}` }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: active ? '#025864' : 'var(--text-muted)' }} />
        <span className="text-sm font-semibold" style={{ color: active ? 'var(--text)' : 'var(--text-muted)' }}>{label}</span>
      </div>
    </motion.button>
  )
}

function LangCard({ label, flag, active, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-3 px-5 py-4 rounded-xl transition-all duration-200 cursor-pointer"
      style={{ border: `2px solid ${active ? '#00D47E' : 'var(--border)'}`, background: 'var(--card)' }}
    >
      <span className="text-2xl">{flag}</span>
      <span className="text-sm font-semibold" style={{ color: active ? 'var(--text)' : 'var(--text-secondary)' }}>{label}</span>
      {active && <Check className="w-4 h-4 ml-auto" style={{ color: '#00D47E' }} />}
    </motion.button>
  )
}

function Btn({ children, onClick, loading, variant = 'primary', icon: Icon }) {
  const styles = {
    primary: { background: '#00D47E', color: '#03363D' },
    ghost:   { background: 'var(--bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
    danger:  { background: 'var(--red-bg)', color: 'var(--red-text)', border: '1px solid var(--red)' },
  }
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-shadow duration-200 hover:shadow-lg disabled:opacity-60 cursor-pointer shrink-0"
      style={styles[variant]}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon && <Icon className="w-4 h-4" />}
      {children}
    </motion.button>
  )
}
