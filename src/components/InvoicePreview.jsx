/* ── KiraciYonet — Nebenkostenabrechnung Print Preview ──
 *
 * Alman tarzı resmi 2-sayfalık abrechnung dokümanı:
 *   1. Anschreiben (cover letter)
 *   2. Berechnung der Umlagen (detaylı hesap)
 *
 * Sender bilgileri (ev sahibi adı, adres, telefon, IBAN, banka) localStorage'da
 * tutulur; ilk açılışta boştur, "Bilgileri Düzenle" ile doldurulur ve sonraki
 * faturalarda otomatik gelir. Hiçbir hesaplamaya etkisi yoktur — yalnızca PDF
 * üzerinde görünen tanıtım metni.
 */

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Printer, X, ArrowLeft, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { householdSize } from '../lib/householdSize'
import { formatNumber, formatDate, getLocaleConfig } from '../i18n/formatters'

const SENDER_KEY = 'kiraciyonet_sender_info'

const emptySender = () => ({
  name: '', addressLines: ['', '', ''], phone: '', bank: '', iban: '',
})

const loadSenderFromStorage = () => {
  try {
    const raw = localStorage.getItem(SENDER_KEY)
    if (!raw) return emptySender()
    const parsed = JSON.parse(raw)
    return {
      name: parsed.name || '',
      addressLines: Array.isArray(parsed.addressLines) && parsed.addressLines.length === 3
        ? parsed.addressLines : ['', '', ''],
      phone: parsed.phone || '',
      bank: parsed.bank || '',
      iban: parsed.iban || '',
    }
  } catch { return emptySender() }
}

const saveSenderToStorage = (info) => {
  try { localStorage.setItem(SENDER_KEY, JSON.stringify(info)) } catch { /* ignore */ }
}

const fmt2 = (n) => Number(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const daysBetween = (a, b) => {
  if (!a || !b) return 0
  const ms = b - a
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)) + 1)
}

export default function InvoicePreview({
  data,
  start,
  end,
  apartments = [],
  tenantsByApt = {},
  onClose,
  onBackToEdit,
}) {
  const { t, i18n } = useTranslation()
  const [sender, setSender] = useState(loadSenderFromStorage)
  const [editingSender, setEditingSender] = useState(false)
  const [draftSender, setDraftSender] = useState(sender)

  useEffect(() => {
    if (editingSender) setDraftSender(sender)
  }, [editingSender, sender])

  if (!data) return null

  const isApt = data.mode !== 'building'

  // Period
  const startDate = useMemo(() => (start instanceof Date ? start : new Date(start)), [start])
  const endDate   = useMemo(() => (end   instanceof Date ? end   : new Date(end)),   [end])
  const periodDays = daysBetween(startDate, endDate)

  // Tenancy days within period
  const tenant = isApt ? data.tenant : null
  const apt    = isApt ? data.apt    : null
  const effStart = data.effectiveStart instanceof Date ? data.effectiveStart : (data.effectiveStart ? new Date(data.effectiveStart) : startDate)
  const effEnd   = data.effectiveEnd   instanceof Date ? data.effectiveEnd   : (data.effectiveEnd   ? new Date(data.effectiveEnd)   : endDate)
  const tenancyDays = daysBetween(effStart, effEnd)

  const periodLabel = `${formatDate(startDate)} – ${formatDate(endDate)}`
  const issueDate   = formatDate(new Date())
  const yearLabel   = startDate.getFullYear()

  // Building info
  const buildingName    = apt?.buildings?.name || data.building?.name || '—'
  const buildingAddress = apt?.buildings?.address || data.building?.address || ''
  const buildingCity    = apt?.buildings?.city || data.building?.city || ''
  const buildingDistr   = apt?.buildings?.district || data.building?.district || ''

  // Apartment label e.g. "DG links", "1.OG · 3"
  const aptLabelText = useMemo(() => {
    if (!apt) return ''
    const f = apt.floor_no, u = apt.unit_no
    if (f && u) return `${f} · ${u}`
    return f || u || ''
  }, [apt])

  // Tenant display name
  const tenantNames = isApt
    ? (tenant?.full_name ? [tenant.full_name] : [])
    : (data.apartmentRows || []).filter(r => r.tenant?.full_name).map(r => r.tenant.full_name)

  const handlePrint = () => window.print()

  const isNach = data.difference > 0.005
  const isGut  = data.difference < -0.005

  const resultLabel = isNach
    ? t('invoice.cover.resultNachzahlung')
    : isGut ? t('invoice.cover.resultGuthaben') : t('invoice.cover.resultBalanced')

  const saveSender = () => {
    setSender(draftSender)
    saveSenderToStorage(draftSender)
    setEditingSender(false)
  }

  const senderHasContent = sender.name || sender.addressLines.some(Boolean) || sender.phone || sender.iban

  // ─── Render ───
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .nka-backdrop {
          position: fixed;
          top: 0; left: var(--sb-w); right: 0; bottom: 0;
          z-index: 1200;
          background: #2a2a2a;
          overflow-y: auto;
          padding: 28px 24px 80px;
        }
        @media (max-width: 768px) { .nka-backdrop { left: 0; } }
        @media print {
          .nka-backdrop {
            position: static !important;
            top: auto !important; left: auto !important;
            right: auto !important; bottom: auto !important;
          }
        }

        .nka-toolbar {
          position: sticky; top: 0; z-index: 5;
          max-width: 920px; margin: 0 auto 22px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px;
          background: rgba(40,40,40,.85);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 12px;
          color: #fafafa;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .nka-toolbar .ttl {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 14px; font-weight: 700; letter-spacing: -0.01em;
        }
        .nka-toolbar .actions { display: flex; gap: 8px; align-items: center; }
        .nka-toolbar button {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 13px; font-weight: 600;
          padding: 7px 12px; border-radius: 8px; cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px;
          transition: background .15s, transform .12s;
        }
        .nka-toolbar .btn-ghost {
          background: transparent;
          color: rgba(255,255,255,.78);
          border: 1px solid rgba(255,255,255,.18);
        }
        .nka-toolbar .btn-ghost:hover { background: rgba(255,255,255,.06); color: #fff; }
        .nka-toolbar .btn-primary {
          background: #fff; color: #1a1a1a; border: 1px solid #fff;
        }
        .nka-toolbar .btn-primary:hover { background: #f4f4f5; }
        .nka-toolbar .icon-btn {
          background: transparent; color: rgba(255,255,255,.6);
          border: 1px solid rgba(255,255,255,.12);
          padding: 7px; border-radius: 8px;
        }
        .nka-toolbar .icon-btn:hover { color: #fff; background: rgba(255,255,255,.06); }

        .nka-paper {
          max-width: 820px;
          margin: 0 auto;
          background: #ffffff;
          color: #000000;
          font-family: 'Inter', 'Helvetica', 'Arial', system-ui, sans-serif;
          font-size: 11pt;
          line-height: 1.45;
          padding: 0;
          border-radius: 4px;
          box-shadow: 0 30px 80px rgba(0,0,0,.55);
        }

        /* Sayfa */
        .nka-page {
          padding: 28mm 22mm 18mm;
          min-height: 277mm;
          box-sizing: border-box;
          position: relative;
          page-break-after: always;
        }
        .nka-page:last-child { page-break-after: auto; }

        /* Cover sayfası */
        .cover-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 28px;
        }
        .sender-block {
          font-size: 9pt;
          color: #333;
          line-height: 1.35;
        }
        .sender-block strong { color: #000; font-weight: 600; }

        .receiver-block {
          margin: 36px 0 28px;
          font-size: 11pt;
          color: #000;
          line-height: 1.4;
        }

        .meta-grid {
          display: grid;
          grid-template-columns: 1fr auto auto auto;
          gap: 10px 18px;
          font-size: 8.5pt;
          color: #555;
          border-bottom: 0.5px solid #888;
          padding-bottom: 4px;
          margin-bottom: 10px;
        }
        .meta-grid .lbl { color: #555; }
        .meta-grid .val { color: #000; font-size: 11pt; line-height: 1.3; }

        .subject-block {
          margin: 26px 0 30px;
          font-size: 11pt;
          color: #000;
          line-height: 1.4;
        }
        .subject-block .row1 { font-weight: 600; }
        .subject-block .row2 { color: #333; }

        .salutation { margin-bottom: 14px; font-size: 11pt; color: #000; }
        .intro-text { margin-bottom: 24px; font-size: 11pt; color: #000; line-height: 1.55; }

        /* Summary table on cover */
        .sum-table {
          width: 100%; border-collapse: collapse; margin-bottom: 22px;
          font-size: 10pt;
        }
        .sum-table thead th {
          font-size: 9pt; font-weight: 700; color: #000;
          text-align: left;
          padding: 7px 8px;
          border-bottom: 1.5px solid #000;
          border-top: 1.5px solid #000;
        }
        .sum-table thead th.num { text-align: right; }
        .sum-table tbody td {
          padding: 7px 8px;
          border-bottom: 0.5px solid #aaa;
          font-variant-numeric: tabular-nums;
        }
        .sum-table tbody td.num { text-align: right; }
        .sum-table tfoot td {
          padding: 8px 8px;
          font-weight: 700;
          border-top: 1.5px solid #000;
          border-bottom: 2.5px double #000;
          font-variant-numeric: tabular-nums;
        }
        .sum-table tfoot td.num { text-align: right; }
        .sum-table tfoot td.result-nach { color: #b91c1c; }
        .sum-table tfoot td.result-gut { color: #15803d; }

        .closing-due-box {
          margin-top: 16px; padding: 8px 12px;
          border: 1.5px solid #000;
          font-size: 11pt; font-weight: 700;
          display: inline-block;
          font-variant-numeric: tabular-nums;
        }
        .closing-pay-line {
          font-weight: 700; font-size: 11pt;
          margin-top: 4px;
        }

        .machine-note {
          margin-top: 14px;
          font-size: 9pt; color: #555;
          font-style: italic;
        }
        .regards { margin-top: 22px; font-size: 11pt; color: #000; }

        /* Footer bank info bar */
        .nka-footer {
          position: absolute;
          left: 22mm; right: 22mm; bottom: 10mm;
          padding-top: 6px;
          border-top: 0.5px solid #999;
          font-size: 8.5pt;
          color: #444;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }

        /* Calculation page */
        .calc-title {
          font-size: 14pt; font-weight: 700; color: #000;
          margin: 0;
        }
        .calc-period {
          font-size: 11pt; color: #000; font-weight: 600; margin-top: 2px;
        }

        .calc-table {
          width: 100%; border-collapse: collapse; margin-top: 22px;
          font-size: 9.5pt;
          color: #000;
        }
        .calc-table thead th {
          font-size: 9pt; font-weight: 700; color: #000;
          text-align: left;
          padding: 8px 6px;
          border-bottom: 1.5px solid #000;
        }
        .calc-table thead th.num { text-align: right; }
        .calc-table thead th.col-calc { text-align: center; }

        .calc-table .cat-row td {
          padding-top: 9px;
          padding-bottom: 0;
          border-top: 0.5px solid #ddd;
          vertical-align: top;
        }
        .calc-table .cat-row td.num {
          text-align: right; font-weight: 500;
          font-variant-numeric: tabular-nums; color: #2563eb;
        }
        .calc-table .calc-cell {
          font-size: 9.5pt; color: #000;
          font-variant-numeric: tabular-nums;
          padding: 9px 6px 0;
        }
        .calc-table .calc-cell .num-blue { color: #2563eb; }
        .calc-table .calc-cell .num-mute { color: #555; }

        .calc-table .calc-row-2 td {
          padding-top: 1px; padding-bottom: 9px;
          border-bottom: 0.5px solid #ddd;
          vertical-align: top;
        }
        .calc-table .calc-row-2 td.num {
          text-align: right; font-weight: 600;
          font-variant-numeric: tabular-nums;
        }

        .calc-totals {
          margin-top: 26px; font-size: 10.5pt;
        }
        .calc-totals .row {
          display: flex; justify-content: space-between;
          padding: 6px 6px;
          font-variant-numeric: tabular-nums;
        }
        .calc-totals .row.gesamt { font-weight: 700; border-top: 1.5px solid #000; }
        .calc-totals .row.vorauszahlung { color: #444; }
        .calc-totals .row.result {
          font-weight: 800; font-size: 12pt;
          border-top: 0.5px solid #000;
          border-bottom: 2.5px double #000;
          padding: 10px 6px;
        }
        .calc-totals .row.result.nach { color: #b91c1c; }
        .calc-totals .row.result.gut  { color: #15803d; }

        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { background: white !important; }
          body * { visibility: hidden !important; }
          .nka-paper, .nka-paper * { visibility: visible !important; }
          .nka-paper {
            position: absolute !important;
            inset: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            width: 210mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .nka-page {
            page-break-after: always;
            min-height: 297mm;
          }
          .nka-page:last-child { page-break-after: auto; }
        }
      `}</style>

      <motion.div
        className="nka-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Toolbar */}
        <div className="nka-toolbar" data-no-print>
          <div className="ttl">{t('invoice.docTitle')}</div>
          <div className="actions">
            <button className="btn-ghost" onClick={onBackToEdit || onClose}>
              <ArrowLeft size={14} /> {t('invoice.toolbar.edit')}
            </button>
            <button className="btn-ghost" onClick={() => setEditingSender(true)}>
              <User size={14} /> {t('invoice.toolbar.editSender')}
            </button>
            <button className="btn-primary" onClick={handlePrint}>
              <Printer size={14} /> {t('invoice.toolbar.print')}
            </button>
            <button className="icon-btn" onClick={onClose} aria-label={t('invoice.toolbar.close')}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Paper — 2 sayfa */}
        <motion.div
          className="nka-paper"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        >
          {/* ═══ SAYFA 1: ANSCHREIBEN ═══ */}
          <CoverPage
            t={t}
            sender={sender}
            tenantNames={tenantNames}
            buildingName={buildingName}
            buildingAddress={buildingAddress}
            buildingCity={buildingCity}
            buildingDistr={buildingDistr}
            aptLabelText={aptLabelText}
            issueDate={issueDate}
            yearLabel={yearLabel}
            data={data}
            isNach={isNach}
            isGut={isGut}
            resultLabel={resultLabel}
          />

          {/* ═══ SAYFA 2: BERECHNUNG ═══ */}
          <CalculationPage
            t={t}
            sender={sender}
            data={data}
            isApt={isApt}
            startDate={startDate}
            endDate={endDate}
            periodDays={periodDays}
            tenancyDays={tenancyDays}
            periodLabel={periodLabel}
            isNach={isNach}
            isGut={isGut}
          />
        </motion.div>
      </motion.div>

      {/* Sender edit modal */}
      <AnimatePresence>
        {editingSender && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditingSender(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(6px)', padding: 16,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 16, width: 480,
                boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
                overflow: 'hidden',
              }}
            >
              <div style={{
                padding: '18px 22px',
                background: 'linear-gradient(135deg, #025864, #03363D)',
                color: '#fff',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  {t('invoice.senderModal.title')}
                </h3>
                <button onClick={() => setEditingSender(false)} style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
                  padding: 6, borderRadius: 8, color: '#fff',
                }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SenderField label={t('invoice.senderModal.name')} value={draftSender.name}
                  onChange={v => setDraftSender(s => ({ ...s, name: v }))} />
                <SenderField label={t('invoice.senderModal.addressLine1')} value={draftSender.addressLines[0]}
                  onChange={v => setDraftSender(s => ({ ...s, addressLines: [v, s.addressLines[1], s.addressLines[2]] }))} />
                <SenderField label={t('invoice.senderModal.addressLine2')} value={draftSender.addressLines[1]}
                  onChange={v => setDraftSender(s => ({ ...s, addressLines: [s.addressLines[0], v, s.addressLines[2]] }))} />
                <SenderField label={t('invoice.senderModal.addressLine3')} value={draftSender.addressLines[2]}
                  onChange={v => setDraftSender(s => ({ ...s, addressLines: [s.addressLines[0], s.addressLines[1], v] }))} />
                <SenderField label={t('invoice.senderModal.phone')} value={draftSender.phone}
                  onChange={v => setDraftSender(s => ({ ...s, phone: v }))} />
                <SenderField label={t('invoice.senderModal.bank')} value={draftSender.bank}
                  onChange={v => setDraftSender(s => ({ ...s, bank: v }))} />
                <SenderField label={t('invoice.senderModal.iban')} value={draftSender.iban}
                  onChange={v => setDraftSender(s => ({ ...s, iban: v }))} />
              </div>
              <div style={{
                padding: '14px 22px', borderTop: '1px solid #eee',
                background: '#FAFBFC', display: 'flex', justifyContent: 'flex-end', gap: 10,
              }}>
                <button onClick={() => setEditingSender(false)} style={{
                  padding: '9px 16px', borderRadius: 9,
                  border: '1.5px solid #E5E7EB', background: '#fff',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748B',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                  {t('invoice.senderModal.cancel')}
                </button>
                <button onClick={saveSender} style={{
                  padding: '9px 18px', borderRadius: 9,
                  border: 'none', background: 'linear-gradient(135deg, #00D47E, #059669)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                  {t('invoice.senderModal.save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function SenderField({ label, value, onChange }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 10, fontWeight: 700, color: '#64748B',
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4,
      }}>{label}</label>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 8,
          border: '1.5px solid #E5E7EB', fontSize: 13, color: '#0F172A',
          fontFamily: "'Inter', system-ui, sans-serif",
          outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

/* ─── Cover sayfası ─── */
function CoverPage({
  t, sender, tenantNames, buildingName, buildingAddress, buildingCity, buildingDistr,
  aptLabelText, issueDate, yearLabel, data, isNach, isGut, resultLabel,
}) {
  // Address compact
  const fullBuildingAddress = [
    buildingAddress,
    [buildingCity, buildingDistr].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ')

  return (
    <div className="nka-page">
      {/* Üst grid: sender (sol) — boş (sağ) */}
      <div className="cover-grid">
        <div className="sender-block">
          {sender.name && <div><strong>{sender.name}</strong></div>}
          {sender.addressLines.filter(Boolean).map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
        <div />
      </div>

      {/* Receiver block */}
      <div className="receiver-block">
        {tenantNames.map((n, i) => <div key={i}>{n}</div>)}
        {buildingAddress && <div>{buildingAddress}</div>}
        {(buildingCity || buildingDistr) && (
          <div>{[buildingDistr, buildingCity].filter(Boolean).join(' ')}</div>
        )}
      </div>

      {/* Meta grid: gönderen reference + telefon + tarih */}
      <div className="meta-grid">
        <div>
          <div className="lbl">{t('invoice.cover.metaIhreZeichen')}</div>
        </div>
        <div>
          <div className="lbl">{t('invoice.cover.metaUnsereZeichen')}</div>
          <div className="val">{sender.name || '—'}</div>
          <div className="val" style={{ fontSize: '10pt' }}>
            {t('invoice.cover.subjectKurz', { year: yearLabel })}
          </div>
        </div>
        <div>
          <div className="lbl">{t('invoice.cover.metaPhone')}</div>
          <div className="val">{sender.phone || '—'}</div>
        </div>
        <div>
          <div className="lbl">{t('invoice.cover.metaDate')}</div>
          <div className="val">{issueDate}</div>
        </div>
      </div>

      {/* Konu */}
      <div className="subject-block">
        <div className="row1">{t('invoice.cover.subjectLine')}</div>
        <div className="row2">
          {[aptLabelText, fullBuildingAddress].filter(Boolean).join(', ')}
        </div>
      </div>

      {/* Selamlama */}
      <div className="salutation">
        {t('invoice.cover.salutation')}
      </div>

      {/* Açıklama */}
      <div className="intro-text">
        {t('invoice.cover.intro')}
      </div>

      {/* Özet tablo */}
      <table className="sum-table">
        <thead>
          <tr>
            <th style={{ width: '36%' }}>{t('invoice.cover.colCostType')}</th>
            <th className="num">{t('invoice.cover.colCosts')}</th>
            <th className="num">{t('invoice.cover.colVorauszahlung')}</th>
            <th className="num">{t('invoice.cover.colResult')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t('invoice.cover.summaryRow')}</td>
            <td className="num">{fmt2(data.totalBillable)}</td>
            <td className="num">{fmt2(data.totalVorauszahlung)}</td>
            <td className="num">{fmt2(Math.abs(data.difference))}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>{t('invoice.cover.totalLabel')}</td>
            <td className="num">{fmt2(data.totalBillable)}</td>
            <td className="num">{fmt2(data.totalVorauszahlung)}</td>
            <td className={`num ${isNach ? 'result-nach' : isGut ? 'result-gut' : ''}`}>
              {fmt2(Math.abs(data.difference))} {resultLabel}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Sonuç */}
      <div className="closing-pay-line">
        {isNach && t('invoice.cover.payInstructionNach', { amount: fmt2(Math.abs(data.difference)) })}
        {isGut && t('invoice.cover.payInstructionGut', { amount: fmt2(Math.abs(data.difference)) })}
        {!isNach && !isGut && t('invoice.cover.payInstructionBalanced')}
      </div>

      <div className="regards">{t('invoice.cover.regards')}</div>

      <div className="machine-note">{t('invoice.cover.machineNote')}</div>

      {/* Bottom bank info */}
      <div className="nka-footer">
        {sender.name && <span>{sender.name}</span>}
        {sender.bank && <span> &nbsp;·&nbsp; {t('invoice.cover.bankLabel')}: {sender.bank}</span>}
        {sender.iban && <span> &nbsp;·&nbsp; IBAN: {sender.iban}</span>}
        {!sender.name && !sender.bank && !sender.iban && (
          <span style={{ fontStyle: 'italic' }}>{t('invoice.cover.bankPlaceholder')}</span>
        )}
      </div>
    </div>
  )
}

/* ─── Hesap (Berechnung) sayfası ─── */
function CalculationPage({ t, sender, data, isApt, periodDays, tenancyDays, periodLabel, isNach, isGut }) {
  const rows = data.byCategory || []

  return (
    <div className="nka-page">
      <h1 className="calc-title">{t('invoice.calc.title')}</h1>
      <div className="calc-period">{t('invoice.calc.periodLine', { period: periodLabel })}</div>

      <table className="calc-table">
        <thead>
          <tr>
            <th>{t('invoice.calc.colCostType')}</th>
            <th className="num">{t('invoice.calc.colAccrued')}</th>
            <th className="col-calc">{t('invoice.calc.colCalcOfShare')}</th>
            <th className="num">{t('invoice.calc.colYourShare')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: '20px 4px', color: '#888', fontStyle: 'italic' }}>
                {t('invoice.calc.empty')}
              </td>
            </tr>
          ) : rows.map((r, i) => (
            <CalculationRow
              key={i} r={r} t={t}
              periodDays={periodDays}
              tenancyDays={tenancyDays}
              isApt={isApt}
            />
          ))}
        </tbody>
      </table>

      {/* Toplamlar */}
      <div className="calc-totals">
        <div className="row gesamt">
          <span>{t('invoice.calc.gesamt')}</span>
          <span>{fmt2(data.totalBillable)}</span>
        </div>
        <div className="row vorauszahlung">
          <span>{t('invoice.calc.vorauszahlung')}</span>
          <span>{fmt2(data.totalVorauszahlung)}</span>
        </div>
        <div className={`row result ${isNach ? 'nach' : isGut ? 'gut' : ''}`}>
          <span>
            {isNach
              ? t('invoice.calc.nachzahlung')
              : isGut ? t('invoice.calc.guthaben') : t('invoice.calc.balanced')}
          </span>
          <span>{fmt2(Math.abs(data.difference))}</span>
        </div>
      </div>

      <div className="nka-footer">
        {sender.name && <span>{sender.name}</span>}
        {sender.bank && <span> &nbsp;·&nbsp; {t('invoice.cover.bankLabel')}: {sender.bank}</span>}
        {sender.iban && <span> &nbsp;·&nbsp; IBAN: {sender.iban}</span>}
        {!sender.name && !sender.bank && !sender.iban && (
          <span style={{ fontStyle: 'italic' }}>{t('invoice.cover.bankPlaceholder')}</span>
        )}
      </div>
    </div>
  )
}

/* ─── Tek bir kategori için Almanca format hesap satırı ─── */
function CalculationRow({ r, t, periodDays, tenancyDays }) {
  const isAptScope = !r.isBuildingScope
  const tageLbl = t('invoice.calc.tage')
  const euroLbl = 'EURO'

  // Apartment-scope: tek satır, "Direkter Anteil" notu
  if (isAptScope) {
    return (
      <>
        <tr className="cat-row">
          <td>{r.name}</td>
          <td className="num">{fmt2(r.totalCost)}</td>
          <td className="calc-cell" style={{ fontStyle: 'italic', color: '#777' }}>
            {t('invoice.calc.aptScope')}
          </td>
          <td className="num"></td>
        </tr>
        <tr className="calc-row-2">
          <td colSpan={3} />
          <td className="num">{fmt2(r.share)}</td>
        </tr>
      </>
    )
  }

  // Building-scope: 2 satırlı format
  // Satır 1: name | totalCost : aptValue unit x totalValue unit | (boş)
  // Satır 2: (boş) (boş) | = subShare EURO : periodDays x tenancyDays Tage | finalShare
  const a = r.aptValue || 0
  const tot = r.totalValue || 0
  const unit = r.unit || ''
  // Pre-pro-rata sub-share (yıl-tam dağıtım, gün ayarlamasından önce)
  const subShare = tot > 0 ? (Number(r.totalCost) * (a / tot)) : Number(r.totalCost) / Math.max(1, tot)
  const finalShare = periodDays > 0 ? (subShare * tenancyDays / periodDays) : subShare

  return (
    <>
      <tr className="cat-row">
        <td>{r.name}</td>
        <td className="num">{fmt2(r.totalCost)}</td>
        <td className="calc-cell">
          <span className="num-blue">{fmt2(r.totalCost)}</span>
          <span> &nbsp;:&nbsp; </span>
          <span>{fmt2(tot)} {unit}</span>
          <span> &nbsp;x&nbsp; </span>
          <span>{fmt2(a)} {unit}</span>
        </td>
        <td className="num"></td>
      </tr>
      <tr className="calc-row-2">
        <td />
        <td />
        <td className="calc-cell" style={{ paddingTop: 0 }}>
          <span>= </span>
          <span className="num-blue">{fmt2(subShare)}</span>
          <span> {euroLbl} &nbsp;:&nbsp; {periodDays} &nbsp;x&nbsp; {tenancyDays} {tageLbl}</span>
        </td>
        <td className="num">{fmt2(finalShare)}</td>
      </tr>
    </>
  )
}
