/* ── Language Switcher — TR / EN / DE ── */
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { Globe, Check } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '../i18n'

export default function LanguageSwitcher({ variant = 'sidebar' }) {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const current = SUPPORTED_LANGUAGES.find(l => l.code === (i18n.language || 'tr').split('-')[0]) || SUPPORTED_LANGUAGES[0]

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const choose = async (code) => {
    await i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', padding: '8px 12px' }}>
      <motion.button
        type="button"
        onClick={() => setOpen(o => !o)}
        title={t('languages.switcherTitle')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          color: 'rgba(255,255,255,0.85)',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.2
        }}
      >
        <Globe className="w-[15px] h-[15px]" style={{ opacity: 0.75 }} />
        <span style={{ flex: 1, textAlign: 'left' }}>{current.flag}</span>
        <span style={{ fontSize: 11, opacity: 0.6 }}>{current.label}</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{
              position: 'absolute',
              left: 12,
              right: 12,
              bottom: 'calc(100% + 6px)',
              background: '#0F2A32',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 12,
              padding: 6,
              boxShadow: '0 20px 50px rgba(0,0,0,0.55)',
              zIndex: 100
            }}
          >
            {SUPPORTED_LANGUAGES.map(lang => {
              const isActive = lang.code === current.code
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => choose(lang.code)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: isActive ? 'rgba(0,212,126,0.10)' : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    color: isActive ? '#00D47E' : 'rgba(255,255,255,0.85)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    padding: '3px 6px',
                    borderRadius: 4,
                    background: isActive ? 'rgba(0,212,126,0.20)' : 'rgba(255,255,255,0.06)',
                    color: isActive ? '#00D47E' : 'rgba(255,255,255,0.75)',
                    minWidth: 28,
                    textAlign: 'center'
                  }}>
                    {lang.flag}
                  </span>
                  <span style={{ flex: 1 }}>{lang.label}</span>
                  {isActive && <Check className="w-[14px] h-[14px]" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
