/* ── KiraciYonet — Bos Sayfa Placeholder ── */

const PAGE_INFO = {
  '/expenses':             { title: 'Giderler', phase: 'Faz 8', icon: 'dollar', color: 'amber' },
  '/accounting':           { title: 'Muhasebe', phase: 'Faz 10', icon: 'chart', color: 'blue' },
  '/documents':            { title: 'Belgeler', phase: 'Faz 12', icon: 'folder', color: 'amber' }
}

const ICONS = {
  building: <><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  alert: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  card: <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
  clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  list: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
  dollar: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  chart: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  folder: <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>
}

const COLOR_MAP = {
  blue:  { bg: 'var(--blue-bg)',  stroke: 'var(--blue)' },
  green: { bg: 'var(--green-bg)', stroke: 'var(--green)' },
  red:   { bg: 'var(--red-bg)',   stroke: 'var(--red)' },
  amber: { bg: 'var(--amber-bg)', stroke: 'var(--amber)' }
}

export default function EmptyPage({ path }) {
  const info = PAGE_INFO[path] || { title: 'Sayfa', phase: '', icon: 'file', color: 'blue' }
  const colors = COLOR_MAP[info.color]

  return (
    <div className="empty-state">
      <div className="empty-state-icon" style={{ background: colors.bg }}>
        <svg viewBox="0 0 24 24" style={{ stroke: colors.stroke }}>
          {ICONS[info.icon]}
        </svg>
      </div>
      <h3 className="empty-state-title">{info.title}</h3>
      <p className="empty-state-desc">
        Bu modul {info.phase}'te aktif olacak. Gelistirme surecinde adim adim eklenmektedir.
      </p>
    </div>
  )
}
