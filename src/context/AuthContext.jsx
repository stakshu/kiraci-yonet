/* ── KiraciYonet — Auth Context ──
 *
 * Kullanıcının session'ı + AAL (Authenticator Assurance Level) takibi.
 * MFA (TOTP) etkinse: signIn sonrası currentLevel='aal1' kalır,
 * uygulama kullanıcıyı AAL2'ye yükseltmek için 6 haneli kod ister.
 * AAL2'ye ulaşana kadar `mfaPending=true` ve korumalı sayfalar açılmaz.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // 'aal1' | 'aal2' | null — kullanıcının şu an ulaştığı seviye
  const [currentAal, setCurrentAal] = useState(null)
  // 'aal1' | 'aal2' | null — bu hesap için gerekli minimum seviye
  const [nextAal, setNextAal] = useState(null)

  // MFA AAL çağrısı bazen pending'de takılabiliyor (Supabase'in iç kilit
  // mekanizması veya yavaş response). Hanging olduğunda loading=true kalmasın
  // diye 4 sn timeout ile sarıyoruz; timeout olursa AAL "bilinmez" sayılır.
  const refreshAal = useCallback(async () => {
    try {
      const result = await Promise.race([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        new Promise(resolve => setTimeout(() => resolve({ data: null, error: { message: 'aal_timeout' } }), 4000)),
      ])
      const { data, error } = result || {}
      if (error || !data) {
        setCurrentAal(null); setNextAal(null)
        return
      }
      setCurrentAal(data.currentLevel || null)
      setNextAal(data.nextLevel || null)
    } catch {
      setCurrentAal(null); setNextAal(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    /* Mevcut oturumu kontrol et — loading state'i MFA çağrısından bağımsız.
       Session belirlenir belirlenmez setLoading(false); refreshAal arka planda
       koşar, AAL state'i geldiğinde mfaPending re-render tetikler. */
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        setUser(session?.user ?? null)
        setLoading(false)
        if (session?.user) refreshAal()  // arka planda, await değil
      } catch {
        if (cancelled) return
        setUser(null)
        setLoading(false)
      }
    })()

    /* Auth değişikliklerini dinle */
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      if (session?.user) refreshAal()
      else { setCurrentAal(null); setNextAal(null) }
    })

    return () => { cancelled = true; subscription.unsubscribe() }
  }, [refreshAal])

  /* Giris */
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await refreshAal()
    return data
  }

  /* Kayit */
  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  /* Cikis */
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  /* Sifre sifirlama */
  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }

  // MFA bekleniyor mu? — kullanıcı authenticated ama AAL2'ye yükselmesi gerekiyor
  const mfaPending = !!user && currentAal === 'aal1' && nextAal === 'aal2'

  return (
    <AuthContext.Provider value={{
      user, loading, currentAal, nextAal, mfaPending,
      signIn, signUp, signOut, resetPassword, refreshAal,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
