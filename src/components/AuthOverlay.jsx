/* ── KiraciYonet — Auth Overlay — Motion + Lucide ── */
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import { Home } from 'lucide-react'

export default function AuthOverlay() {
  const { signIn, signUp } = useAuth()
  const { showToast } = useToast()
  const [tab, setTab] = useState('login')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('')

  const clearMsg = () => setMessage(null)
  const switchTab = (t) => { setTab(t); clearMsg() }

  const handleLogin = async (e) => {
    e.preventDefault()
    clearMsg()
    setLoading(true)
    try {
      await signIn(loginEmail.trim(), loginPassword)
      showToast('Basariyla giris yapildi!')
    } catch (err) {
      const msgs = {
        'Invalid login credentials': 'E-posta veya sifre hatali.',
        'Email not confirmed': 'E-posta adresiniz henuz dogrulanmadi.'
      }
      setMessage({ type: 'error', text: msgs[err.message] || err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    clearMsg()
    if (regPassword !== regPasswordConfirm) {
      setMessage({ type: 'error', text: 'Sifreler eslesmiyor.' })
      return
    }
    setLoading(true)
    try {
      const data = await signUp(regEmail.trim(), regPassword)
      if (data.user && !data.session) {
        setMessage({ type: 'success', text: 'Kayit basarili! Lutfen e-posta adresinizi dogrulayin.' })
        switchTab('login')
      } else {
        showToast('Kayit basarili! Hos geldiniz.')
      }
    } catch (err) {
      const msgs = {
        'User already registered': 'Bu e-posta adresi zaten kayitli.',
        'Password should be at least 6 characters': 'Sifre en az 6 karakter olmalidir.'
      }
      setMessage({ type: 'error', text: msgs[err.message] || err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-overlay">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="auth-header">
          <motion.div
            className="auth-logo"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="auth-logo-icon">
              <Home className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <span className="auth-logo-text">KiraciYonet</span>
          </motion.div>
          <h2 className="auth-title">{tab === 'login' ? 'Giris Yap' : 'Kayit Ol'}</h2>
          <p className="auth-subtitle">
            {tab === 'login' ? 'Hesabiniza giris yaparak devam edin' : 'Yeni bir hesap olusturun'}
          </p>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => switchTab('login')}>Giris Yap</button>
          <button className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => switchTab('register')}>Kayit Ol</button>
        </div>

        <div className="auth-body">
          <AnimatePresence mode="wait">
            {message && (
              <motion.div
                key="msg"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`auth-message ${message.type}`}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {tab === 'login' ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label" htmlFor="loginEmail">E-posta</label>
                <input className="form-input" id="loginEmail" type="email" placeholder="ornek@email.com" required
                  value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="loginPassword">Sifre</label>
                <input className="form-input" id="loginPassword" type="password" placeholder="••••••••" required minLength={6}
                  value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              </div>
              <motion.button
                className="auth-btn"
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Giris yapiliyor...' : 'Giris Yap'}
              </motion.button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label" htmlFor="regEmail">E-posta</label>
                <input className="form-input" id="regEmail" type="email" placeholder="ornek@email.com" required
                  value={regEmail} onChange={e => setRegEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="regPassword">Sifre</label>
                <input className="form-input" id="regPassword" type="password" placeholder="En az 6 karakter" required minLength={6}
                  value={regPassword} onChange={e => setRegPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="regPasswordConfirm">Sifre Tekrar</label>
                <input className="form-input" id="regPasswordConfirm" type="password" placeholder="Sifrenizi tekrarlayin" required minLength={6}
                  value={regPasswordConfirm} onChange={e => setRegPasswordConfirm(e.target.value)} />
              </div>
              <motion.button
                className="auth-btn"
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Kayit yapiliyor...' : 'Kayit Ol'}
              </motion.button>
            </form>
          )}

          <div className="auth-footer">
            {tab === 'login' ? (
              <>Hesabiniz yok mu? <a href="#" onClick={(e) => { e.preventDefault(); switchTab('register') }} style={{ color: '#00D47E', fontWeight: 600, textDecoration: 'none' }}>Kayit olun</a></>
            ) : (
              <>Zaten hesabiniz var mi? <a href="#" onClick={(e) => { e.preventDefault(); switchTab('login') }} style={{ color: '#00D47E', fontWeight: 600, textDecoration: 'none' }}>Giris yapin</a></>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
