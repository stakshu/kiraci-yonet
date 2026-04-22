/* ── KiraciYonet — Auth Overlay — "The Lobby" ── */
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import LanguageSwitcher from './LanguageSwitcher'
import { Loader2, Building2, ShieldCheck, TrendingUp } from 'lucide-react'

const ERR_MAP = {
  'Invalid login credentials': 'auth.error.invalidCredentials',
  'Email not confirmed': 'auth.error.emailNotConfirmed',
  'User already registered': 'auth.error.userExists',
  'Password should be at least 6 characters': 'auth.error.passwordShort',
  'For security purposes, you can only request this once every 60 seconds': 'auth.error.rateLimited'
}

const ease = [0.16, 1, 0.3, 1]

/* ── Topografik SVG desen ── */
function TopoPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="topo" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
          <path d="M20 80 Q60 20 100 60 T180 40" fill="none" stroke="white" strokeWidth="0.8" />
          <path d="M0 120 Q40 80 80 100 T160 80 T200 90" fill="none" stroke="white" strokeWidth="0.6" />
          <path d="M10 160 Q50 120 90 140 T170 120 T200 130" fill="none" stroke="white" strokeWidth="0.5" />
          <path d="M0 40 Q30 10 70 30 T140 10 T200 25" fill="none" stroke="white" strokeWidth="0.7" />
          <path d="M20 190 Q60 160 100 175 T180 155" fill="none" stroke="white" strokeWidth="0.4" />
          <circle cx="85" cy="95" r="20" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="85" cy="95" r="35" fill="none" stroke="white" strokeWidth="0.3" />
          <circle cx="150" cy="45" r="15" fill="none" stroke="white" strokeWidth="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#topo)" />
    </svg>
  )
}

/* ── Input bileşeni ── */
function AuthInput({ label, id, type = 'text', placeholder, required, minLength, value, onChange }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label htmlFor={id} style={{
        display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6, fontFamily: 'inherit',
      }}>
        {label}
      </label>
      <input
        id={id} type={type} placeholder={placeholder} required={required} minLength={minLength}
        value={value} onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '14px 16px', fontSize: 14, color: 'white',
          background: 'rgba(255,255,255,0.05)', outline: 'none', fontFamily: 'inherit',
          border: 'none', borderRadius: 10,
          borderLeft: focused ? '3px solid #00D47E' : '3px solid transparent',
          boxShadow: focused ? '0 0 20px rgba(0,212,126,0.08)' : 'none',
          transition: 'all 0.25s ease',
        }}
      />
    </div>
  )
}

export default function AuthOverlay() {
  const { t } = useTranslation()
  const { signIn, signUp, resetPassword } = useAuth()
  const { showToast } = useToast()

  const [view, setView] = useState('login') // 'login' | 'register' | 'forgot'
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')

  const clearMsg = () => setMessage(null)
  const switchView = (v) => { setView(v); clearMsg() }
  const translateError = (msg) => {
    const key = ERR_MAP[msg]
    return key ? t(key) : msg
  }

  const handleLogin = async (e) => {
    e.preventDefault(); clearMsg(); setLoading(true)
    try {
      await signIn(loginEmail.trim(), loginPassword)
      showToast(t('auth.loginSuccess'))
    } catch (err) {
      setMessage({ type: 'error', text: translateError(err.message) })
    } finally { setLoading(false) }
  }

  const handleRegister = async (e) => {
    e.preventDefault(); clearMsg()
    if (regPassword !== regConfirm) { setMessage({ type: 'error', text: t('auth.passwordMismatch') }); return }
    setLoading(true)
    try {
      const data = await signUp(regEmail.trim(), regPassword)
      if (data.user && !data.session) {
        setMessage({ type: 'success', text: t('auth.registerVerify') })
        switchView('login')
      } else { showToast(t('auth.registerSuccess')) }
    } catch (err) {
      setMessage({ type: 'error', text: translateError(err.message) })
    } finally { setLoading(false) }
  }

  const handleForgot = async (e) => {
    e.preventDefault(); clearMsg(); setLoading(true)
    try {
      await resetPassword(forgotEmail.trim())
      setMessage({ type: 'success', text: t('auth.resetSent') })
    } catch (err) {
      setMessage({ type: 'error', text: translateError(err.message) })
    } finally { setLoading(false) }
  }

  const titles = {
    login:    { h: t('auth.loginTitle'),    p: t('auth.loginSubtitle') },
    register: { h: t('auth.registerTitle'), p: t('auth.registerSubtitle') },
    forgot:   { h: t('auth.forgotTitle'),   p: t('auth.forgotSubtitle') }
  }

  const stats = [
    { icon: Building2,   label: t('auth.marketing.statPropertiesLabel'), sub: t('auth.marketing.statPropertiesSub') },
    { icon: ShieldCheck, label: t('auth.marketing.statCollectionLabel'), sub: t('auth.marketing.statCollectionSub') },
    { icon: TrendingUp,  label: t('auth.marketing.statVolumeLabel'),     sub: t('auth.marketing.statVolumeSub') }
  ]

  const marketingLines = [
    t('auth.marketing.line1'),
    t('auth.marketing.line2'),
    t('auth.marketing.line3')
  ]

  /* ── Submit button ── */
  const SubmitBtn = ({ children }) => (
    <motion.button
      type="submit" disabled={loading}
      style={{
        width: '100%', padding: '14px', borderRadius: 10, border: 'none',
        background: '#00D47E', color: '#03363D', fontSize: 14, fontWeight: 700,
        fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 8, letterSpacing: '0.3px',
        boxShadow: '0 0 30px rgba(0,212,126,0.15)',
        transition: 'box-shadow 0.3s ease',
      }}
      whileHover={{ scale: 1.01, boxShadow: '0 0 40px rgba(0,212,126,0.25)' }}
      whileTap={{ scale: 0.98 }}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </motion.button>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, display: 'flex',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    }}>

      {/* ══════════ SOL PANEL — Marka Alanı ══════════ */}
      <motion.div
        className="hidden md:flex"
        style={{
          width: '55%', position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(155deg, #025864 0%, #03363D 60%, #022a33 100%)',
          flexDirection: 'column', justifyContent: 'center', padding: '60px 64px',
        }}
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease }}
      >
        {/* Topografik desen */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 1.2 }}
        >
          <TopoPattern />
        </motion.div>

        {/* Büyük dekoratif K */}
        <motion.div
          style={{
            position: 'absolute', top: -40, right: -30,
            fontSize: 380, fontWeight: 900, lineHeight: 1,
            color: 'white', opacity: 0.04, userSelect: 'none',
            letterSpacing: '-20px',
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.04 }}
          transition={{ delay: 0.2, duration: 1, ease }}
        >
          K
        </motion.div>

        {/* İçerik */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 440 }}>
          {/* Logo */}
          <motion.div
            style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56 }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 10, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #00D47E, #00B86E)',
              boxShadow: '0 4px 16px rgba(0,212,126,0.3)',
            }}>
              <span style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>K</span>
            </div>
            <span style={{ color: 'white', fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>
              KiraciYonet
            </span>
          </motion.div>

          {/* Ana başlık */}
          {marketingLines.map((line, i) => (
            <motion.div
              key={i}
              style={{
                fontSize: i === 2 ? 42 : 40, fontWeight: 800, color: 'white',
                lineHeight: 1.15, letterSpacing: '-1.5px',
                ...(i === 2 ? { color: '#00D47E' } : {}),
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.12, duration: 0.6, ease }}
            >
              {line}
            </motion.div>
          ))}

          {/* Accent çizgi */}
          <motion.div
            style={{ width: 48, height: 3, background: '#00D47E', borderRadius: 2, marginTop: 28, marginBottom: 28 }}
            initial={{ width: 0 }}
            animate={{ width: 48 }}
            transition={{ delay: 0.7, duration: 0.5, ease }}
          />

          {/* Alt metin */}
          <motion.p
            style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.7, maxWidth: 360 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            {t('auth.marketing.description')}
          </motion.p>

          {/* İstatistikler */}
          <motion.div
            style={{ display: 'flex', gap: 24, marginTop: 48 }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6, ease }}
          >
            {stats.map(({ icon: Icon, label, sub }, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <Icon size={18} style={{ color: '#00D47E', opacity: 0.8 }} />
                <div>
                  <div style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>{label}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{sub}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          style={{
            position: 'absolute', bottom: 32, left: 64,
            color: 'rgba(255,255,255,0.25)', fontSize: 12,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          {t('auth.marketing.copyright')}
        </motion.div>
      </motion.div>

      {/* ══════════ SAĞ PANEL — Form Alanı ══════════ */}
      <motion.div
        style={{
          flex: 1, background: '#0a1628', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', padding: '40px 24px',
          position: 'relative', overflow: 'hidden',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease }}
      >
        {/* Dekoratif arka plan deseni */}
        <div style={{
          position: 'absolute', top: -100, right: -100,
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,126,0.04) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 250, height: 250, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2,88,100,0.06) 0%, transparent 70%)',
        }} />

        <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>

          {/* Mobilde logo */}
          <div className="flex md:hidden" style={{
            alignItems: 'center', gap: 10, marginBottom: 40, justifyContent: 'center',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #00D47E, #00B86E)',
            }}>
              <span style={{ color: 'white', fontSize: 16, fontWeight: 800 }}>K</span>
            </div>
            <span style={{ color: 'white', fontSize: 17, fontWeight: 700 }}>KiraciYonet</span>
          </div>

          {/* Başlık */}
          <AnimatePresence mode="wait">
            <motion.div
              key={view + '-title'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease }}
              style={{ marginBottom: 36 }}
            >
              <h1 style={{ color: 'white', fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', margin: 0 }}>
                {titles[view].h}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 6 }}>
                {titles[view].p}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Mesaj */}
          <AnimatePresence mode="wait">
            {message && (
              <motion.div
                key="msg"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease }}
                style={{
                  marginBottom: 20, padding: '12px 16px', borderRadius: 10,
                  fontSize: 13, fontWeight: 500,
                  background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(0,212,126,0.1)',
                  borderLeft: `3px solid ${message.type === 'error' ? '#ef4444' : '#00D47E'}`,
                  color: message.type === 'error' ? '#f87171' : '#00D47E',
                }}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Formlar */}
          <AnimatePresence mode="wait">
            {view === 'login' && (
              <motion.form
                key="login"
                onSubmit={handleLogin}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                <AuthInput label={t('auth.email')} id="loginEmail" type="email" placeholder={t('auth.emailPlaceholder')}
                  required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                <AuthInput label={t('auth.password')} id="loginPass" type="password" placeholder={t('auth.passwordPlaceholder')}
                  required minLength={6} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -8 }}>
                  <button type="button"
                    onClick={() => { switchView('forgot'); setForgotEmail(loginEmail) }}
                    style={{
                      background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                      fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => e.target.style.color = '#00D47E'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
                  >
                    {t('auth.forgotLink')}
                  </button>
                </div>

                <SubmitBtn>{loading ? t('auth.loginLoading') : t('auth.loginButton')}</SubmitBtn>

                {/* Ayırıcı */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '4px 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)',
                  }} />
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>

                <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                  {t('auth.noAccount')}{' '}
                  <button type="button" onClick={() => switchView('register')}
                    style={{
                      background: 'none', border: 'none', color: '#00D47E',
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                    }}>
                    {t('auth.signUpAction')}
                  </button>
                </p>
              </motion.form>
            )}

            {view === 'register' && (
              <motion.form
                key="register"
                onSubmit={handleRegister}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                <AuthInput label={t('auth.email')} id="regEmail" type="email" placeholder={t('auth.emailPlaceholder')}
                  required value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                <AuthInput label={t('auth.password')} id="regPass" type="password" placeholder={t('auth.passwordHint')}
                  required minLength={6} value={regPassword} onChange={e => setRegPassword(e.target.value)} />
                <AuthInput label={t('auth.passwordRepeat')} id="regConfirm" type="password" placeholder={t('auth.passwordRepeatPlaceholder')}
                  required minLength={6} value={regConfirm} onChange={e => setRegConfirm(e.target.value)} />

                <SubmitBtn>{loading ? t('auth.registerLoading') : t('auth.registerButton')}</SubmitBtn>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '4px 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <div style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>

                <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                  {t('auth.haveAccount')}{' '}
                  <button type="button" onClick={() => switchView('login')}
                    style={{
                      background: 'none', border: 'none', color: '#00D47E',
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                    }}>
                    {t('auth.signInAction')}
                  </button>
                </p>
              </motion.form>
            )}

            {view === 'forgot' && (
              <motion.form
                key="forgot"
                onSubmit={handleForgot}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                <AuthInput label={t('auth.email')} id="forgotEmail" type="email" placeholder={t('auth.emailPlaceholder')}
                  required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />

                <SubmitBtn>{loading ? t('auth.forgotLoading') : t('auth.forgotButton')}</SubmitBtn>

                <button type="button" onClick={() => switchView('login')}
                  style={{
                    background: 'none', border: 'none', textAlign: 'center',
                    color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer',
                    fontFamily: 'inherit', marginTop: 4,
                  }}
                  onMouseEnter={e => e.target.style.color = '#00D47E'}
                  onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
                >
                  {t('auth.backToLogin')}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Language switcher */}
          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 180 }}>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
