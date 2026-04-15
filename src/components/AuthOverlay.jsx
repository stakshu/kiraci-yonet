/* ── KiraciYonet — Auth Overlay — Dark & Premium ── */
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import { Loader2 } from 'lucide-react'

/* ── Turkce hata mapping ── */
const ERROR_MAP = {
  'Invalid login credentials': 'E-posta veya şifre hatalı.',
  'Email not confirmed': 'E-posta adresiniz henüz doğrulanmadı.',
  'User already registered': 'Bu e-posta adresi zaten kayıtlı.',
  'Password should be at least 6 characters': 'Şifre en az 6 karakter olmalıdır.',
  'For security purposes, you can only request this once every 60 seconds': 'Güvenlik nedeniyle 60 saniyede bir istek gönderebilirsiniz.',
}

const localizeError = (msg) => ERROR_MAP[msg] || msg

/* ── Ease curve ── */
const ease = [0.16, 1, 0.3, 1]

export default function AuthOverlay() {
  const { signIn, signUp, resetPassword } = useAuth()
  const { showToast } = useToast()

  const [tab, setTab] = useState('login')        // 'login' | 'register'
  const [view, setView] = useState('form')        // 'form' | 'forgot'
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  /* Login */
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  /* Register */
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('')

  /* Forgot */
  const [forgotEmail, setForgotEmail] = useState('')

  const clearMsg = () => setMessage(null)
  const switchTab = (t) => { setTab(t); setView('form'); clearMsg() }

  /* ── Handlers ── */
  const handleLogin = async (e) => {
    e.preventDefault()
    clearMsg()
    setLoading(true)
    try {
      await signIn(loginEmail.trim(), loginPassword)
      showToast('Başarıyla giriş yapıldı!')
    } catch (err) {
      setMessage({ type: 'error', text: localizeError(err.message) })
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    clearMsg()
    if (regPassword !== regPasswordConfirm) {
      setMessage({ type: 'error', text: 'Şifreler eşleşmiyor.' })
      return
    }
    setLoading(true)
    try {
      const data = await signUp(regEmail.trim(), regPassword)
      if (data.user && !data.session) {
        setMessage({ type: 'success', text: 'Kayıt başarılı! Lütfen e-posta adresinizi doğrulayın.' })
        switchTab('login')
      } else {
        showToast('Kayıt başarılı! Hoş geldiniz.')
      }
    } catch (err) {
      setMessage({ type: 'error', text: localizeError(err.message) })
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    clearMsg()
    setLoading(true)
    try {
      await resetPassword(forgotEmail.trim())
      setMessage({ type: 'success', text: 'Sıfırlama linki e-posta adresinize gönderildi.' })
    } catch (err) {
      setMessage({ type: 'error', text: localizeError(err.message) })
    } finally {
      setLoading(false)
    }
  }

  /* ── Input stili ── */
  const inputClass = [
    'w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30',
    'bg-white/[0.06] border border-white/[0.1]',
    'outline-none transition-all duration-200',
    'focus:border-[#00D47E]/50 focus:ring-2 focus:ring-[#00D47E]/20',
  ].join(' ')

  const labelClass = 'block text-white/70 text-sm font-medium mb-1.5'

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #080d19 0%, #0d1520 50%, #080d19 100%)' }}>

      {/* ── Animated Gradient Orbs ── */}
      <div className="absolute -top-40 -right-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-60 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,212,126,0.12) 0%, transparent 65%)' }}>
        <motion.div className="w-full h-full"
          animate={{ x: [0, -30, 10, 0], y: [0, 20, -15, 0] }}
          transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }} />
      </div>
      <div className="absolute -bottom-60 -left-40 w-[600px] h-[600px] rounded-full blur-3xl opacity-50 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(2,88,100,0.18) 0%, transparent 65%)' }}>
        <motion.div className="w-full h-full"
          animate={{ x: [0, 20, -15, 0], y: [0, -25, 10, 0] }}
          transition={{ duration: 12, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }} />
      </div>
      <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,212,126,0.08) 0%, transparent 70%)' }}>
        <motion.div className="w-full h-full"
          animate={{ x: [0, 15, -20, 0], y: [0, -10, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }} />
      </div>

      {/* ── Glassmorphism Card ── */}
      <motion.div
        className="relative z-10 w-[420px] max-w-[92vw] rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/30"
        style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease }}
      >
        {/* ── Header ── */}
        <div className="pt-10 pb-2 px-10 text-center">
          <motion.div
            className="mx-auto mb-5 w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #025864, #00D47E)', boxShadow: '0 8px 32px rgba(0,212,126,0.3)' }}
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease }}
          >
            <span className="text-white text-2xl font-extrabold tracking-tight">K</span>
          </motion.div>
          <motion.h1
            className="text-white text-2xl font-bold tracking-tight"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5, ease }}
          >
            KiraciYonet
          </motion.h1>
          <motion.p
            className="text-white/40 text-xs tracking-[3px] uppercase mt-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            Mülk Yönetim Sistemi
          </motion.p>
        </div>

        {/* ── Tabs ── */}
        {view === 'form' && (
          <div className="flex mx-10 mt-6 border-b border-white/[0.08]">
            {[
              { key: 'login', label: 'Giriş Yap' },
              { key: 'register', label: 'Kayıt Ol' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                className={`flex-1 pb-3 text-sm font-semibold transition-all duration-200 border-b-2 ${
                  tab === key
                    ? 'text-white border-[#00D47E]'
                    : 'text-white/40 border-transparent hover:text-white/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── Body ── */}
        <div className="px-10 pt-6 pb-10">

          {/* Message */}
          <AnimatePresence mode="wait">
            {message && (
              <motion.div
                key="msg"
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.25, ease }}
                className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium ${
                  message.type === 'error'
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                    : 'bg-[#00D47E]/10 border border-[#00D47E]/20 text-[#00D47E]'
                }`}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Forms */}
          <AnimatePresence mode="wait">
            {view === 'forgot' ? (
              /* ── Sifremi Unuttum ── */
              <motion.form
                key="forgot"
                onSubmit={handleForgotPassword}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease }}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <h2 className="text-white text-lg font-bold">Şifre Sıfırlama</h2>
                  <p className="text-white/40 text-sm mt-1">E-posta adresinize sıfırlama linki göndereceğiz</p>
                </div>
                <div>
                  <label className={labelClass} htmlFor="forgotEmail">E-posta</label>
                  <input className={inputClass} id="forgotEmail" type="email" placeholder="ornek@email.com" required
                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
                </div>
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #025864, #00D47E)', boxShadow: '0 4px 20px rgba(0,212,126,0.25)' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
                </motion.button>
                <button
                  type="button"
                  onClick={() => { setView('form'); clearMsg() }}
                  className="w-full text-center text-sm text-white/50 hover:text-[#00D47E] transition-colors duration-200 mt-2"
                >
                  ← Giriş ekranına dön
                </button>
              </motion.form>
            ) : tab === 'login' ? (
              /* ── Giris Formu ── */
              <motion.form
                key="login"
                onSubmit={handleLogin}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease }}
                className="space-y-4"
              >
                <div>
                  <label className={labelClass} htmlFor="loginEmail">E-posta</label>
                  <input className={inputClass} id="loginEmail" type="email" placeholder="ornek@email.com" required
                    value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="loginPassword">Şifre</label>
                  <input className={inputClass} id="loginPassword" type="password" placeholder="••••••••" required minLength={6}
                    value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); clearMsg(); setForgotEmail(loginEmail) }}
                    className="text-xs text-white/50 hover:text-[#00D47E] transition-colors duration-200"
                  >
                    Şifremi unuttum?
                  </button>
                </div>
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #025864, #00D47E)', boxShadow: '0 4px 20px rgba(0,212,126,0.25)' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                </motion.button>
                <p className="text-center text-sm text-white/40 mt-2">
                  Hesabınız yok mu?{' '}
                  <button type="button" onClick={() => switchTab('register')}
                    className="text-[#00D47E] font-semibold hover:text-[#00D47E]/80 transition-colors">
                    Kayıt Ol
                  </button>
                </p>
              </motion.form>
            ) : (
              /* ── Kayit Formu ── */
              <motion.form
                key="register"
                onSubmit={handleRegister}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease }}
                className="space-y-4"
              >
                <div>
                  <label className={labelClass} htmlFor="regEmail">E-posta</label>
                  <input className={inputClass} id="regEmail" type="email" placeholder="ornek@email.com" required
                    value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="regPassword">Şifre</label>
                  <input className={inputClass} id="regPassword" type="password" placeholder="En az 6 karakter" required minLength={6}
                    value={regPassword} onChange={e => setRegPassword(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="regPasswordConfirm">Şifre Tekrar</label>
                  <input className={inputClass} id="regPasswordConfirm" type="password" placeholder="Şifrenizi tekrarlayın" required minLength={6}
                    value={regPasswordConfirm} onChange={e => setRegPasswordConfirm(e.target.value)} />
                </div>
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #025864, #00D47E)', boxShadow: '0 4px 20px rgba(0,212,126,0.25)' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
                </motion.button>
                <p className="text-center text-sm text-white/40 mt-2">
                  Zaten hesabınız var mı?{' '}
                  <button type="button" onClick={() => switchTab('login')}
                    className="text-[#00D47E] font-semibold hover:text-[#00D47E]/80 transition-colors">
                    Giriş Yap
                  </button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
