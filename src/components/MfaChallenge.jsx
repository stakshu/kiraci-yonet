/* ── KiraciYonet — MFA Challenge Ekranı ──
 *
 * AAL2 gerekli (kullanıcının verified TOTP factor'ı var) ama henüz
 * AAL2'ye yükselmemiş — bu ekran 6 haneli kod ister, doğru girilirse
 * AuthContext.refreshAal() ile mfaPending=false olur ve uygulama açılır.
 */
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ShieldCheck, AlertTriangle, LogOut, Loader2 } from 'lucide-react'

const font = "'Plus Jakarta Sans', system-ui, sans-serif"

export default function MfaChallenge() {
  const { t } = useTranslation()
  const { signOut, refreshAal } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [factorId, setFactorId] = useState(null)

  useEffect(() => {
    // Kullanıcının verified TOTP factor'ını al — challenge bu factor için yapılır.
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = (data?.totp || []).find(f => f.status === 'verified')
      setFactorId(verified?.id || null)
    })
  }, [])

  const handleVerify = async (e) => {
    e?.preventDefault()
    if (!factorId || code.length !== 6 || verifying) return
    setVerifying(true)
    setError('')

    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId })
    if (chErr) {
      setError(chErr.message)
      setVerifying(false)
      return
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId, challengeId: ch.id, code: code.trim(),
    })
    if (vErr) {
      setError(t('settings.challenge.wrongCode'))
      setVerifying(false)
      setCode('')
      return
    }
    // Başarılı — AAL refresh, App tekrar render edip mfaPending=false ile geçer
    await refreshAal()
  }

  const handleCancel = async () => {
    await signOut()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #025864 0%, #03363D 100%)',
      fontFamily: font, padding: 20,
    }}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{
          background: '#fff', borderRadius: 18, width: 'min(440px, 100%)',
          padding: '32px 32px 28px',
          boxShadow: '0 25px 80px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'linear-gradient(135deg, #025864, #03363D)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', margin: '0 auto 16px',
        }}>
          <ShieldCheck size={26} />
        </div>

        <h1 style={{
          margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A',
          textAlign: 'center', letterSpacing: '-0.01em',
        }}>
          {t('settings.challenge.title')}
        </h1>
        <p style={{
          margin: '6px 0 22px', fontSize: 13, color: '#64748B',
          textAlign: 'center', lineHeight: 1.5,
        }}>
          {t('settings.challenge.subtitle')}
        </p>

        <form onSubmit={handleVerify}>
          <label style={{
            display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B',
            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8,
          }}>
            {t('settings.challenge.codeLabel')}
          </label>
          <input
            type="text" inputMode="numeric" autoComplete="one-time-code"
            maxLength={6} placeholder="123456"
            value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
            autoFocus
            style={{
              width: '100%', padding: '14px 18px', borderRadius: 10,
              border: `1.5px solid ${error ? '#FCA5A5' : '#E5E7EB'}`,
              fontSize: 26, fontWeight: 700,
              fontFamily: 'ui-monospace, monospace',
              letterSpacing: '0.5em', textAlign: 'center',
              outline: 'none', boxSizing: 'border-box',
              background: '#FAFBFC',
            }}
          />
          {error && (
            <div style={{
              marginTop: 10, fontSize: 12, color: '#DC2626',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <AlertTriangle size={13} /> {error}
            </div>
          )}

          <motion.button
            type="submit"
            disabled={code.length !== 6 || verifying || !factorId}
            whileHover={{ scale: code.length === 6 && !verifying ? 1.01 : 1 }}
            whileTap={{ scale: code.length === 6 && !verifying ? 0.99 : 1 }}
            style={{
              width: '100%', marginTop: 16,
              padding: '13px 16px', borderRadius: 10, border: 'none',
              background: code.length === 6 && !verifying
                ? 'linear-gradient(135deg, #025864, #03363D)'
                : '#CBD5E1',
              color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: font,
              cursor: code.length === 6 && !verifying ? 'pointer' : 'not-allowed',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: code.length === 6 ? '0 6px 18px rgba(2,88,100,0.3)' : 'none',
            }}
          >
            {verifying
              ? <><Loader2 size={15} className="animate-spin" /> {t('settings.challenge.verifying')}</>
              : <>{t('settings.challenge.verify')}</>}
          </motion.button>

          <button
            type="button" onClick={handleCancel}
            style={{
              width: '100%', marginTop: 10,
              padding: '10px 16px', borderRadius: 10,
              border: 'none', background: 'transparent',
              color: '#64748B', fontSize: 12.5, fontWeight: 600, fontFamily: font,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <LogOut size={13} /> {t('settings.challenge.logout')}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
