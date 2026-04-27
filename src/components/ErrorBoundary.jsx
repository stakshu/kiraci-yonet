/* ── KiraciYonet — Top-level Error Boundary ──
 *
 * Render sırasında atılan beklenmeyen bir hata olursa beyaz ekran
 * yerine bir kart gösterir + console'a hatanın stack trace'ini düşer.
 */
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[KiraciYonet] Unhandled render error:', error, info)

    // Yeni deploy sonrası eski chunk hash'i isteyen bir lazy import patladıysa
    // tek seferlik otomatik reload — sessionStorage ile sonsuz döngü engelli.
    const msg = String(error?.message || '')
    const looksLikeStaleChunk =
      /Failed to fetch dynamically imported module/i.test(msg) ||
      /Loading chunk \d+ failed/i.test(msg) ||
      /Importing a module script failed/i.test(msg)
    if (looksLikeStaleChunk) {
      const k = '__kys_chunk_reload__'
      if (!sessionStorage.getItem(k)) {
        sessionStorage.setItem(k, '1')
        window.location.reload()
      }
    }
  }

  handleReset = () => {
    try { localStorage.clear() } catch { /* ignore */ }
    try { sessionStorage.clear() } catch { /* ignore */ }
    window.location.replace('/')
  }

  render() {
    if (!this.state.error) return this.props.children

    const msg = this.state.error?.message || String(this.state.error)
    const stack = this.state.error?.stack || ''

    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: '#0F172A', color: '#fff',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, overflowY: 'auto',
      }}>
        <div style={{
          maxWidth: 560, width: '100%',
          background: '#1E293B', borderRadius: 14, padding: 28,
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
            Bir şey ters gitti
          </h1>
          <p style={{ marginTop: 8, fontSize: 13, color: '#94A3B8', lineHeight: 1.55 }}>
            Uygulama beklenmeyen bir hata aldı. Genellikle eski bir oturum verisi yüzünden olur — aşağıdaki butonla sıfırla, sonra tekrar giriş yap.
          </p>
          <pre style={{
            marginTop: 14, padding: 12, borderRadius: 8,
            background: '#0F172A', color: '#FCA5A5',
            fontSize: 12, fontFamily: 'ui-monospace, monospace',
            overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            maxHeight: 200, overflowY: 'auto',
          }}>
            {msg}
            {stack && '\n\n' + stack}
          </pre>
          <button onClick={this.handleReset} style={{
            marginTop: 16, padding: '10px 20px', borderRadius: 9,
            border: 'none', background: 'linear-gradient(135deg, #00D47E, #059669)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
          }}>
            Oturumu Sıfırla & Yeniden Yükle
          </button>
        </div>
      </div>
    )
  }
}
