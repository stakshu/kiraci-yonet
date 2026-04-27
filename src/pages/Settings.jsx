/* ── KiraciYonet — Ayarlar ──
 *
 * Bölümler:
 *   · Güvenlik → İki Adımlı Doğrulama (TOTP MFA)
 *   · Güvenlik → Şifre Değiştirme
 *
 * MFA: Supabase Auth MFA API'si tüm secret üretimi/doğrulamayı yapar.
 * Şifre: önce signInWithPassword ile mevcut şifre teyit edilir,
 * sonra updateUser ile yeni şifre yazılır.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import {
  Shield, ShieldCheck, Smartphone, Copy, Check, X, AlertTriangle, Loader2,
  KeyRound, Eye, EyeOff,
} from 'lucide-react'

const font = "'Plus Jakarta Sans', system-ui, sans-serif"
const C = {
  teal: '#025864', green: '#00D47E', darkTeal: '#03363D',
  red: '#DC2626', amber: '#D97706',
  text: '#0F172A', textMuted: '#64748B', textFaint: '#94A3B8',
  border: '#E5E7EB', borderLight: '#F1F5F9', card: '#FFFFFF',
}
const cardBox = {
  background: C.card, borderRadius: 16,
  boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
  overflow: 'hidden',
}

export default function Settings() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [factors, setFactors] = useState([])
  const [loading, setLoading] = useState(true)

  // Setup modal state
  const [enrolling, setEnrolling] = useState(false)
  const [enrollStep, setEnrollStep] = useState('qr')   // 'loading' | 'qr' | 'verifying'
  const [enrollData, setEnrollData] = useState(null)   // { factorId, qr_code, secret }
  const [code, setCode] = useState('')
  const [enrollError, setEnrollError] = useState('')

  // Disable confirm
  const [confirmDisable, setConfirmDisable] = useState(false)
  const [busy, setBusy] = useState(false)

  // Password change state
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwShow, setPwShow] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  useEffect(() => { loadFactors() }, [])

  const loadFactors = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) {
      showToast(t('settings.toasts.errorPrefix', { msg: error.message }), 'error')
      setLoading(false)
      return
    }
    setFactors(data?.totp || [])
    setLoading(false)
  }

  const verifiedTotp = factors.find(f => f.status === 'verified')
  const hasMfa = !!verifiedTotp

  // ── Enroll flow ──
  const startEnroll = async () => {
    setEnrolling(true)
    setEnrollStep('loading')
    setEnrollError('')
    setCode('')
    // Yarıda kalmış 'unverified' factor varsa önce temizle, sonra yeniden enroll
    const stale = factors.filter(f => f.status !== 'verified')
    for (const s of stale) {
      await supabase.auth.mfa.unenroll({ factorId: s.id })
    }

    // issuer: authenticator app'te görünen üst-başlık ("KiraciYonet").
    // friendlyName: Supabase tarafında bu factor'ün dahili etiketi.
    // issuer geçilmezse Supabase request origin'den türetiyor — localhost vs vercel
    // gibi ortam-bağımlı yanlış isim görünmesini engellemek için açıkça veriyoruz.
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'KiraciYonet',
      friendlyName: 'KiraciYonet',
    })
    if (error) {
      setEnrollError(error.message)
      setEnrollStep('qr')
      return
    }
    setEnrollData({
      factorId: data.id,
      qr_code: data.totp.qr_code,
      secret: data.totp.secret,
    })
    setEnrollStep('qr')
  }

  const cancelEnroll = async () => {
    if (enrollData?.factorId) {
      await supabase.auth.mfa.unenroll({ factorId: enrollData.factorId })
    }
    setEnrolling(false)
    setEnrollData(null)
    setCode('')
    setEnrollError('')
    loadFactors()
  }

  const verifyEnroll = async (e) => {
    e?.preventDefault()
    if (!enrollData?.factorId || code.trim().length !== 6) return
    setEnrollStep('verifying')
    setEnrollError('')
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.factorId })
    if (chErr) {
      setEnrollError(chErr.message)
      setEnrollStep('qr')
      return
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: enrollData.factorId,
      challengeId: ch.id,
      code: code.trim(),
    })
    if (vErr) {
      setEnrollError(vErr.message || t('settings.mfa.toasts.codeWrong'))
      setEnrollStep('qr')
      return
    }
    showToast(t('settings.mfa.toasts.enabled'), 'success')
    setEnrolling(false)
    setEnrollData(null)
    setCode('')
    loadFactors()
  }

  // ── Disable flow ──
  const disableMfa = async () => {
    if (!verifiedTotp) return
    setBusy(true)
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedTotp.id })
    setBusy(false)
    if (error) {
      showToast(t('settings.toasts.errorPrefix', { msg: error.message }), 'error')
      return
    }
    showToast(t('settings.mfa.toasts.disabled'), 'success')
    setConfirmDisable(false)
    loadFactors()
  }

  const copySecret = async () => {
    if (!enrollData?.secret) return
    try {
      await navigator.clipboard.writeText(enrollData.secret)
      showToast(t('settings.mfa.toasts.secretCopied'), 'success')
    } catch { /* clipboard not available */ }
  }

  // ── Password change ──
  const handlePasswordChange = async (e) => {
    e?.preventDefault()
    setPwError('')

    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwError(t('settings.password.errors.required'))
      return
    }
    if (pwNew.length < 8) {
      setPwError(t('settings.password.errors.tooShort'))
      return
    }
    if (pwNew !== pwConfirm) {
      setPwError(t('settings.password.errors.mismatch'))
      return
    }
    if (pwCurrent === pwNew) {
      setPwError(t('settings.password.errors.sameAsOld'))
      return
    }
    if (!user?.email) {
      setPwError(t('settings.password.errors.unknown'))
      return
    }

    setPwSaving(true)
    // 1) Mevcut şifreyi doğrula
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: user.email, password: pwCurrent,
    })
    if (signErr) {
      setPwSaving(false)
      setPwError(t('settings.password.errors.wrongCurrent'))
      return
    }
    // 2) Yeni şifreyi yaz
    const { error: updErr } = await supabase.auth.updateUser({ password: pwNew })
    setPwSaving(false)
    if (updErr) {
      setPwError(updErr.message)
      return
    }
    setPwCurrent(''); setPwNew(''); setPwConfirm('')
    showToast(t('settings.password.toasts.changed'), 'success')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 22, fontFamily: font }}
    >
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', margin: 0 }}>
          {t('settings.title')}
        </h1>
        <p style={{ fontSize: 13, color: C.textFaint, marginTop: 3 }}>
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Security card */}
      <div style={cardBox}>
        <div style={{
          padding: '16px 22px', borderBottom: `1px solid ${C.borderLight}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: '#F0FDFA', color: C.teal,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={16} />
          </div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>
            {t('settings.security.title')}
          </h2>
        </div>

        <div style={{ padding: '20px 22px' }}>
          {/* MFA status row */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 16,
            padding: '14px 16px', borderRadius: 12,
            border: `1px solid ${C.borderLight}`,
            background: hasMfa ? 'rgba(0,212,126,0.04)' : '#FAFBFC',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: hasMfa ? '#F0FDF4' : '#F1F5F9',
              color: hasMfa ? '#059669' : C.textMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {hasMfa ? <ShieldCheck size={20} /> : <Smartphone size={20} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>
                {t('settings.mfa.label')}
              </div>
              <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>
                {hasMfa ? t('settings.mfa.enabledDesc') : t('settings.mfa.disabledDesc')}
              </div>
              {hasMfa && (
                <div style={{
                  marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 6,
                  background: '#F0FDF4', border: '1px solid #A7F3D0',
                  fontSize: 11, fontWeight: 700, color: '#059669',
                }}>
                  <Check size={11} /> {t('settings.mfa.statusActive')}
                </div>
              )}
            </div>
            <div style={{ flexShrink: 0 }}>
              {loading ? (
                <Loader2 size={18} style={{ color: C.textFaint }} className="animate-spin" />
              ) : hasMfa ? (
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setConfirmDisable(true)}
                  style={{
                    padding: '9px 16px', borderRadius: 9,
                    border: '1.5px solid #FCA5A5', background: '#fff',
                    color: C.red, fontSize: 13, fontWeight: 700, fontFamily: font,
                    cursor: 'pointer',
                  }}
                >
                  {t('settings.mfa.disable')}
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={startEnroll}
                  style={{
                    padding: '9px 18px', borderRadius: 9, border: 'none',
                    background: `linear-gradient(135deg, ${C.teal}, ${C.darkTeal})`,
                    color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: font,
                    cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    boxShadow: '0 4px 12px rgba(2,88,100,0.25)',
                  }}
                >
                  <Smartphone size={14} /> {t('settings.mfa.enable')}
                </motion.button>
              )}
            </div>
          </div>

          {/* Helper text */}
          <p style={{ marginTop: 14, fontSize: 11.5, color: C.textFaint, lineHeight: 1.55 }}>
            {t('settings.mfa.helper')}
          </p>
        </div>
      </div>

      {/* ═══ Password change card ═══ */}
      <div style={cardBox}>
        <div style={{
          padding: '16px 22px', borderBottom: `1px solid ${C.borderLight}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: '#FFFBEB', color: C.amber,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <KeyRound size={16} />
          </div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>
            {t('settings.password.title')}
          </h2>
        </div>

        <form onSubmit={handlePasswordChange} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Current */}
          <PwField
            label={t('settings.password.current')}
            value={pwCurrent}
            onChange={setPwCurrent}
            show={pwShow}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          {/* New */}
          <PwField
            label={t('settings.password.new')}
            value={pwNew}
            onChange={setPwNew}
            show={pwShow}
            placeholder={t('settings.password.newPh')}
            autoComplete="new-password"
            hint={t('settings.password.hint')}
          />
          {/* Confirm */}
          <PwField
            label={t('settings.password.confirm')}
            value={pwConfirm}
            onChange={setPwConfirm}
            show={pwShow}
            placeholder="••••••••"
            autoComplete="new-password"
          />

          {/* Show toggle */}
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: C.textMuted, cursor: 'pointer', userSelect: 'none',
          }}>
            <input type="checkbox" checked={pwShow}
              onChange={e => setPwShow(e.target.checked)}
              style={{ accentColor: C.teal, width: 14, height: 14 }} />
            {pwShow
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><EyeOff size={12} /> {t('settings.password.hide')}</span>
              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Eye size={12} /> {t('settings.password.show')}</span>}
          </label>

          {pwError && (
            <div style={{
              padding: '10px 12px', borderRadius: 9,
              background: '#FEF2F2', border: '1px solid #FCA5A5',
              fontSize: 12.5, color: C.red,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertTriangle size={14} /> {pwError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <motion.button
              whileHover={{ scale: pwSaving ? 1 : 1.02 }}
              whileTap={{ scale: pwSaving ? 1 : 0.98 }}
              type="submit" disabled={pwSaving}
              style={{
                padding: '10px 22px', borderRadius: 9, border: 'none',
                background: pwSaving
                  ? '#CBD5E1'
                  : `linear-gradient(135deg, ${C.teal}, ${C.darkTeal})`,
                color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: font,
                cursor: pwSaving ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 7,
                boxShadow: pwSaving ? 'none' : '0 4px 12px rgba(2,88,100,0.25)',
              }}
            >
              {pwSaving
                ? <><Loader2 size={14} className="animate-spin" /> {t('settings.password.saving')}</>
                : <><Check size={14} /> {t('settings.password.save')}</>}
            </motion.button>
          </div>
        </form>
      </div>

      {/* Setup modal */}
      <AnimatePresence>
        {enrolling && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !busy && cancelEnroll()}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              paddingLeft: 'var(--sb-w)', zIndex: 1100, backdropFilter: 'blur(4px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 16, width: 460,
                maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
                fontFamily: font,
              }}
            >
              <div style={{
                background: 'linear-gradient(135deg, #025864, #03363D)',
                padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                color: '#fff',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Smartphone size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
                    {t('settings.mfa.setupTitle')}
                  </h3>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  type="button" onClick={cancelEnroll}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}
                >
                  <X size={16} color="#fff" />
                </motion.button>
              </div>

              <form onSubmit={verifyEnroll}>
                <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {enrollStep === 'loading' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: C.textFaint, gap: 10 }}>
                      <Loader2 size={20} className="animate-spin" />
                      <span>{t('settings.mfa.preparing')}</span>
                    </div>
                  )}

                  {enrollStep !== 'loading' && enrollData && (
                    <>
                      {/* Step 1: Scan */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                          {t('settings.mfa.step1Title')}
                        </div>
                        <p style={{ fontSize: 12.5, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>
                          {t('settings.mfa.step1Desc')}
                        </p>
                      </div>

                      {/* QR + secret */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: 16, borderRadius: 12,
                        border: `1px solid ${C.borderLight}`, background: '#FAFBFC',
                      }}>
                        <div style={{
                          width: 132, height: 132, flexShrink: 0,
                          background: '#fff', borderRadius: 10,
                          padding: 8, border: `1px solid ${C.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {enrollData.qr_code ? (
                            <img src={enrollData.qr_code} alt="QR"
                              style={{ width: '100%', height: '100%' }} />
                          ) : (
                            <Loader2 size={20} className="animate-spin" />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                            {t('settings.mfa.manualLabel')}
                          </div>
                          <div style={{
                            fontFamily: 'ui-monospace, monospace',
                            fontSize: 12, color: C.text,
                            wordBreak: 'break-all', lineHeight: 1.4,
                            background: '#fff', padding: '8px 10px',
                            borderRadius: 7, border: `1px solid ${C.border}`,
                            marginBottom: 6,
                          }}>
                            {enrollData.secret}
                          </div>
                          <button type="button" onClick={copySecret}
                            style={{
                              fontFamily: font, fontSize: 11, fontWeight: 700,
                              padding: '5px 10px', borderRadius: 6,
                              border: `1px solid ${C.border}`, background: '#fff',
                              color: C.textMuted, cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                            }}
                          >
                            <Copy size={11} /> {t('settings.mfa.copy')}
                          </button>
                        </div>
                      </div>

                      {/* Step 2: Code */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                          {t('settings.mfa.step2Title')}
                        </div>
                        <p style={{ fontSize: 12.5, color: C.textMuted, margin: '0 0 10px', lineHeight: 1.5 }}>
                          {t('settings.mfa.step2Desc')}
                        </p>
                        <input
                          type="text" inputMode="numeric" autoComplete="one-time-code"
                          maxLength={6} placeholder="123456"
                          value={code}
                          onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                          autoFocus
                          style={{
                            width: '100%', padding: '12px 16px', borderRadius: 10,
                            border: `1.5px solid ${enrollError ? '#FCA5A5' : C.border}`,
                            fontSize: 22, fontWeight: 700,
                            fontFamily: 'ui-monospace, monospace',
                            letterSpacing: '0.4em', textAlign: 'center',
                            outline: 'none', boxSizing: 'border-box',
                          }}
                        />
                        {enrollError && (
                          <div style={{
                            marginTop: 8, fontSize: 12, color: C.red,
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                            <AlertTriangle size={13} /> {enrollError}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div style={{
                  padding: '14px 26px', borderTop: `1px solid ${C.borderLight}`,
                  background: '#FAFBFC',
                  display: 'flex', justifyContent: 'flex-end', gap: 10,
                }}>
                  <button type="button" onClick={cancelEnroll}
                    style={{
                      padding: '9px 18px', borderRadius: 9,
                      border: `1.5px solid ${C.border}`, background: '#fff',
                      color: C.textMuted, fontSize: 13, fontWeight: 600, fontFamily: font,
                      cursor: 'pointer',
                    }}
                  >
                    {t('settings.mfa.cancel')}
                  </button>
                  <button type="submit"
                    disabled={code.length !== 6 || enrollStep === 'verifying' || enrollStep === 'loading'}
                    style={{
                      padding: '9px 22px', borderRadius: 9, border: 'none',
                      background: code.length === 6
                        ? `linear-gradient(135deg, ${C.teal}, ${C.darkTeal})`
                        : '#CBD5E1',
                      color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: font,
                      cursor: code.length === 6 && enrollStep !== 'verifying' ? 'pointer' : 'not-allowed',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {enrollStep === 'verifying'
                      ? <><Loader2 size={14} className="animate-spin" /> {t('settings.mfa.verifying')}</>
                      : <><Check size={14} /> {t('settings.mfa.verify')}</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disable confirm modal */}
      <AnimatePresence>
        {confirmDisable && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !busy && setConfirmDisable(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              paddingLeft: 'var(--sb-w)', zIndex: 1100, backdropFilter: 'blur(4px)',
              fontFamily: font,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 16 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 16, width: 400, overflow: 'hidden',
                boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              }}
            >
              <div style={{
                background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
                padding: '22px 26px', display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AlertTriangle size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>
                    {t('settings.mfa.disableTitle')}
                  </h3>
                </div>
              </div>
              <div style={{ padding: '22px 26px' }}>
                <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.55 }}>
                  {t('settings.mfa.disableMessage')}
                </p>
              </div>
              <div style={{
                padding: '14px 26px', borderTop: `1px solid ${C.borderLight}`,
                display: 'flex', justifyContent: 'flex-end', gap: 10,
              }}>
                <button type="button" onClick={() => setConfirmDisable(false)} disabled={busy}
                  style={{
                    padding: '9px 18px', borderRadius: 9,
                    border: `1.5px solid ${C.border}`, background: '#fff',
                    color: C.textMuted, fontSize: 13, fontWeight: 600, fontFamily: font,
                    cursor: busy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {t('settings.mfa.cancel')}
                </button>
                <button type="button" onClick={disableMfa} disabled={busy}
                  style={{
                    padding: '9px 22px', borderRadius: 9, border: 'none',
                    background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
                    color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: font,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  {busy ? t('settings.mfa.disabling') : t('settings.mfa.confirmDisable')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── Şifre input field helper ─── */
function PwField({ label, value, onChange, show, placeholder, autoComplete, hint }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6,
      }}>
        {label}
      </label>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 9,
          border: `1.5px solid ${C.border}`, background: '#FAFBFC',
          fontSize: 14, color: C.text, fontFamily: font,
          outline: 'none', boxSizing: 'border-box',
          letterSpacing: show ? 'normal' : '0.15em',
        }}
      />
      {hint && (
        <div style={{ marginTop: 5, fontSize: 11, color: C.textFaint }}>
          {hint}
        </div>
      )}
    </div>
  )
}
