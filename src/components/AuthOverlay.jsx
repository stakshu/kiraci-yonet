/* ── KiraciYonet — Auth Overlay (Faz 1) ── */
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'

export default function AuthOverlay() {
  const { signIn, signUp } = useAuth()
  const { showToast } = useToast()
  const [tab, setTab] = useState('login')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  /* Form state */
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('')

  const clearMsg = () => setMessage(null)

  const switchTab = (t) => {
    setTab(t)
    clearMsg()
  }

  /* Giris */
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

  /* Kayit */
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
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <span className="auth-logo-text">KiraciYonet</span>
          </div>
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
          {message && (
            <div className={`auth-message ${message.type}`}>{message.text}</div>
          )}

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
              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? 'Giris yapiliyor...' : 'Giris Yap'}
              </button>
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
              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? 'Kayit yapiliyor...' : 'Kayit Ol'}
              </button>
            </form>
          )}

          <div className="auth-footer">
            {tab === 'login' ? (
              <>Hesabiniz yok mu? <a href="#" onClick={(e) => { e.preventDefault(); switchTab('register') }} style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>Kayit olun</a></>
            ) : (
              <>Zaten hesabiniz var mi? <a href="#" onClick={(e) => { e.preventDefault(); switchTab('login') }} style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>Giris yapin</a></>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
