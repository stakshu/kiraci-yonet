/* ── KiraciYonet — Fatura Önizleme (editorial paper, print-ready) ──
 *
 * Yan Gider Hesap Kesimi'nin kâğıt halini tarayıcı-yazdır akışı için sunar.
 * Modal chrome `data-no-print`; gerçek paper `.invoice-paper`. @media print
 * kurallarıyla yalnızca paper basılır → kullanıcı "Yazdır" → "Microsoft Print
 * to PDF" ile kaydeder.
 */

import { motion } from 'motion/react'
import { Printer, X, ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { householdSize } from '../lib/householdSize'
import { formatMoney, formatNumber, formatDate, getLocaleConfig } from '../i18n/formatters'

const fmtStamp = (d, lang) => {
  const cfg = getLocaleConfig(lang)
  const dt = d instanceof Date ? d : new Date(d)
  return dt.toLocaleString(cfg.locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
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
  if (!data) return null

  const lang = i18n.language
  const isApt = data.mode !== 'building'
  const periodLabel = `${formatDate(start)} – ${formatDate(end)}`
  const issueStamp  = fmtStamp(new Date(), lang)
  const issueDate   = formatDate(new Date())
  const invoiceNo   = `${t('invoice.top.invoicePrefix')}-${new Date(start).getFullYear()}-${(Date.now() % 10000).toString().padStart(4, '0')}`

  // Apartment-mode hesapları
  const apt        = isApt ? data.apt : null
  const tenant     = isApt ? data.tenant : null
  const buildingName = apt?.buildings?.name || (data.building?.name) || '—'

  const aptArea = apt ? (Number(apt.m2_net) || Number(apt.m2_gross) || 0) : 0
  const totalAreaInBuilding = apartments
    .filter(a => apt && a.building_id === apt.building_id && tenantsByApt[a.id])
    .reduce((s, a) => s + (Number(a.m2_net) || Number(a.m2_gross) || 0), 0)

  const aptPersons   = isApt ? householdSize(tenant) : 0
  const totalPersons = apartments
    .filter(a => apt && a.building_id === apt.building_id && tenantsByApt[a.id])
    .reduce((s, a) => s + householdSize(tenantsByApt[a.id]), 0)

  const aptLabelText = (a) => {
    if (!a) return '—'
    return a.floor_no
      ? t('invoice.apartmentLabel.withFloor', { floor: a.floor_no, unit: a.unit_no || '—' })
      : t('invoice.apartmentLabel.noFloor', { unit: a.unit_no || '—' })
  }

  const handlePrint = () => window.print()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Instrument+Sans:wght@400;500;600&display=swap');

        .invoice-backdrop {
          position: fixed;
          top: 0;
          left: var(--sb-w);
          right: 0;
          bottom: 0;
          z-index: 1200;
          background: #1c1a17;
          background-image:
            radial-gradient(circle at 22% 12%, rgba(200,90,60,.06), transparent 45%),
            radial-gradient(circle at 78% 88%, rgba(45,90,63,.06), transparent 45%);
          overflow-y: auto;
          padding: 28px 24px 80px;
        }
        @media (max-width: 768px) {
          .invoice-backdrop { left: 0; }
        }
        @media print {
          .invoice-backdrop {
            position: static !important;
            top: auto !important; left: auto !important;
            right: auto !important; bottom: auto !important;
          }
        }
        .invoice-toolbar {
          position: sticky; top: 0; z-index: 5;
          max-width: 920px; margin: 0 auto 22px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px;
          background: rgba(28,26,23,.78);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(217,210,196,.18);
          border-radius: 14px;
          color: #fffdf8;
          font-family: 'Instrument Sans', system-ui, sans-serif;
        }
        .invoice-toolbar .ttl {
          font-family: 'Fraunces', serif;
          font-size: 17px;
          font-weight: 400;
          letter-spacing: -0.01em;
          font-variation-settings: "opsz" 144;
        }
        .invoice-toolbar .ttl em {
          font-style: italic;
          color: #d97757;
          font-weight: 300;
        }
        .invoice-toolbar .actions { display: flex; gap: 8px; }
        .invoice-toolbar button {
          font-family: 'Instrument Sans', system-ui, sans-serif;
          font-size: 13px; font-weight: 500;
          padding: 8px 14px; border-radius: 8px; cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px;
          transition: background .15s, transform .12s;
        }
        .invoice-toolbar .btn-ghost {
          background: transparent;
          color: rgba(255,253,248,.78);
          border: 1px solid rgba(217,210,196,.22);
        }
        .invoice-toolbar .btn-ghost:hover {
          background: rgba(255,253,248,.06);
          color: #fffdf8;
        }
        .invoice-toolbar .btn-primary {
          background: #fffdf8; color: #1c1a17; border: 1px solid #fffdf8;
        }
        .invoice-toolbar .btn-primary:hover { background: #d97757; border-color:#d97757; color:#fffdf8; }
        .invoice-toolbar .icon-btn {
          background: transparent; color: rgba(255,253,248,.6);
          border: 1px solid rgba(217,210,196,.18);
          padding: 8px; border-radius: 8px;
        }
        .invoice-toolbar .icon-btn:hover { color: #fffdf8; background: rgba(255,253,248,.06); }

        .invoice-paper {
          max-width: 920px;
          margin: 0 auto;
          background: #fffdf8;
          color: #1c1a17;
          font-family: 'Instrument Sans', system-ui, sans-serif;
          font-size: 14px;
          line-height: 1.55;
          padding: 56px 64px 64px;
          border-radius: 6px;
          box-shadow: 0 30px 80px rgba(0,0,0,.45), 0 4px 12px rgba(0,0,0,.2);
          position: relative;
          overflow: hidden;
        }
        .invoice-paper::before {
          content:'';
          position:absolute; top:0; left:0; right:0; height:5px;
          background: linear-gradient(90deg, #8b2e1f 0%, #d97757 50%, #8b2e1f 100%);
        }

        .inv-top {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 28px;
          padding-bottom: 18px;
          border-bottom: 1.5px solid #1c1a17;
          margin-bottom: 32px;
        }
        .inv-stamp {
          font-size: 11px;
          color: #8a847b;
          letter-spacing: .03em;
          padding-top: 6px;
        }
        .inv-title {
          font-family: 'Fraunces', serif;
          font-weight: 400;
          font-size: 38px;
          letter-spacing: -0.025em;
          line-height: 1;
          font-variation-settings: "opsz" 144;
          margin: 0;
        }
        .inv-title em {
          font-style: italic;
          color: #8b2e1f;
          font-weight: 300;
        }
        .inv-period {
          text-align: right;
          font-size: 11px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #8a847b;
          line-height: 1.6;
        }
        .inv-period strong {
          display: block;
          margin-top: 4px;
          color: #1c1a17;
          font-weight: 500;
          font-size: 13px;
          letter-spacing: 0;
          text-transform: none;
          font-variant-numeric: tabular-nums;
        }
        .inv-period .meta-no {
          margin-top: 6px;
          font-size: 10px;
          color: #8a847b;
          letter-spacing: .06em;
        }

        .inv-parties {
          margin-bottom: 28px;
        }
        .inv-parties h3 {
          font-size: 10px; font-weight: 600;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: #8a847b;
          margin-bottom: 6px;
        }
        .inv-parties .party-body {
          font-size: 13.5px;
          color: #1c1a17;
          white-space: pre-line;
          line-height: 1.55;
        }

        .inv-property {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 28px;
          padding: 18px 22px;
          background: #efeae1;
          border-radius: 4px;
          margin-bottom: 32px;
        }
        .inv-property .kv label {
          display: block;
          font-size: 10px; font-weight: 600;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #8a847b;
          margin-bottom: 4px;
        }
        .inv-property .kv span {
          font-size: 13.5px; font-weight: 500;
          color: #1c1a17;
          font-variant-numeric: tabular-nums;
        }

        .inv-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }
        .inv-table thead th {
          font-size: 10px; font-weight: 600;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #4a4641;
          text-align: left;
          padding: 10px 4px;
          border-bottom: 1.5px solid #1c1a17;
        }
        .inv-table thead th.num { text-align: right; }
        .inv-table tbody td {
          padding: 11px 4px;
          border-bottom: 1px dashed #d9d2c4;
          vertical-align: top;
        }
        .inv-table tbody td.num {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .inv-table tbody td.key {
          color: #8a847b;
          font-style: italic;
          font-size: 12px;
        }
        .inv-table tbody tr:last-child td { border-bottom: none; }

        .inv-totals {
          margin-top: 6px;
          font-size: 14px;
        }
        .inv-totals .row {
          display: flex; justify-content: space-between;
          padding: 11px 4px;
          border-bottom: 1px dashed #d9d2c4;
          font-variant-numeric: tabular-nums;
        }
        .inv-totals .row.sum {
          font-weight: 600;
          padding-top: 16px;
          border-top: 1.5px solid #1c1a17;
          border-bottom: 1px dashed #d9d2c4;
        }
        .inv-totals .row.prepay { color: #4a4641; }
        .inv-totals .row.result {
          font-family: 'Fraunces', serif;
          font-size: 22px;
          font-weight: 500;
          letter-spacing: -0.01em;
          padding: 18px 4px;
          border-top: 1px solid #1c1a17;
          border-bottom: 3px double #1c1a17;
          font-variation-settings: "opsz" 144;
        }
        .inv-totals .row.result.nach { color: #8b2e1f; }
        .inv-totals .row.result.gut  { color: #2d5a3f; }

        .inv-footer {
          margin-top: 36px;
          padding-top: 20px;
          border-top: 1px solid #d9d2c4;
          font-size: 11.5px;
          line-height: 1.65;
          color: #8a847b;
        }
        .inv-footer strong { color: #4a4641; }

        .inv-section-h {
          font-family: 'Fraunces', serif;
          font-size: 18px;
          font-weight: 500;
          letter-spacing: -0.01em;
          color: #1c1a17;
          margin: 0 0 12px;
          font-variation-settings: "opsz" 144;
        }
        .inv-section-h em { font-style: italic; color: #8b2e1f; font-weight: 400; }

        @media print {
          @page { size: A4 portrait; margin: 14mm 12mm; }
          html, body { background: white !important; }
          body * { visibility: hidden !important; }
          .invoice-paper, .invoice-paper * { visibility: visible !important; }
          .invoice-paper {
            position: absolute !important;
            inset: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100% !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
          }
          .invoice-paper::before { display: none !important; }
          .inv-table tbody tr,
          .inv-totals .row { break-inside: avoid; }
          .inv-footer { break-inside: avoid; }
        }
      `}</style>

      <motion.div
        className="invoice-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* TOOLBAR */}
        <div className="invoice-toolbar" data-no-print>
          <div className="ttl">{t('invoice.titlePrefix')} <em>{t('invoice.titleEm')}</em></div>
          <div className="actions">
            <button className="btn-ghost" onClick={onBackToEdit || onClose}>
              <ArrowLeft size={14} /> {t('invoice.toolbar.edit')}
            </button>
            <button className="btn-primary" onClick={handlePrint}>
              <Printer size={14} /> {t('invoice.toolbar.print')}
            </button>
            <button className="icon-btn" onClick={onClose} aria-label={t('invoice.toolbar.close')}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* PAPER */}
        <motion.div
          className="invoice-paper"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        >
          <div className="inv-top">
            <div className="inv-stamp">{issueStamp}</div>
            <h1 className="inv-title">{t('invoice.titlePrefix')} <em>{t('invoice.titleEm')}</em></h1>
            <div className="inv-period">
              {t('invoice.top.period')}
              <strong>{periodLabel}</strong>
              <div className="meta-no">{t('invoice.top.no')} {invoiceNo}</div>
            </div>
          </div>

          <div className="inv-parties">
            <div>
              <h3>{t('invoice.parties.tenant')}</h3>
              <div className="party-body">
                {isApt
                  ? (tenant?.full_name || t('invoice.parties.noActiveTenant'))
                  : t('invoice.parties.buildingTenants', {
                      apts: data.apartmentRows?.length || 0,
                      active: data.apartmentRows?.filter(r => r.tenant).length || 0,
                    })}
              </div>
            </div>
          </div>

          {isApt ? (
            <div className="inv-property">
              <div className="kv">
                <label>{t('invoice.propertyApt.title')}</label>
                <span>{`${buildingName}, ${aptLabelText(apt)}`}</span>
              </div>
              <div className="kv">
                <label>{t('invoice.propertyApt.area')}</label>
                <span>{aptArea > 0 ? `${formatNumber(aptArea, { min: 2, max: 2 })} / ${formatNumber(totalAreaInBuilding || aptArea, { min: 2, max: 2 })} m²` : '—'}</span>
              </div>
              <div className="kv">
                <label>{t('invoice.propertyApt.persons')}</label>
                <span>{aptPersons > 0 ? `${aptPersons} / ${totalPersons || aptPersons}` : '—'}</span>
              </div>
            </div>
          ) : (
            <div className="inv-property">
              <div className="kv">
                <label>{t('invoice.propertyBld.building')}</label>
                <span>{data.building?.name || '—'}</span>
              </div>
              <div className="kv">
                <label>{t('invoice.propertyBld.aptCount')}</label>
                <span>{data.apartmentRows?.length || 0}</span>
              </div>
              <div className="kv">
                <label>{t('invoice.propertyBld.duration')}</label>
                <span>{t('invoice.propertyBld.months', { n: data.monthsInPeriod })}</span>
              </div>
            </div>
          )}

          {isApt ? (
            <ApartmentBreakdown data={data} t={t} />
          ) : (
            <BuildingBreakdown data={data} t={t} aptLabelText={aptLabelText} />
          )}

          <div className="inv-footer">
            <strong>{t('invoice.footer.explanationLabel')}</strong> {t('invoice.footer.explanation')}
            <br /><br />
            {data.difference > 0.005 ? (
              <>
                {t('invoice.footer.payNoticePre')}
                <strong>{t('invoice.footer.payNoticeStrong', { amount: formatMoney(Math.abs(data.difference)) })}</strong>
                {t('invoice.footer.payNoticePost')}
              </>
            ) : data.difference < -0.005 ? (
              <>
                {t('invoice.footer.refundNoticePre')}
                <strong>{t('invoice.footer.refundNoticeStrong', { amount: formatMoney(Math.abs(data.difference)) })}</strong>
                {t('invoice.footer.refundNoticePost')}
              </>
            ) : (
              <>{t('invoice.footer.balancedNotice')}</>
            )}
            <br /><br />
            {t('invoice.footer.objectionNotice')}
            <br /><br />
            <span style={{ fontSize: 10, color: '#bbb4a6' }}>
              {t('invoice.footer.issueDate', { date: issueDate })}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}

/* ── Apartment Mode Breakdown ── */
function ApartmentBreakdown({ data, t }) {
  const rows = data.byCategory || []
  const isNach = data.difference > 0.005
  const isGut  = data.difference < -0.005

  return (
    <>
      <table className="inv-table">
        <thead>
          <tr>
            <th>{t('invoice.tableApt.item')}</th>
            <th>{t('invoice.tableApt.key')}</th>
            <th className="num">{t('invoice.tableApt.total')}</th>
            <th className="num">{t('invoice.tableApt.share')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} style={{ textAlign:'center', color:'#8a847b', fontStyle:'italic', padding:'20px 4px' }}>
              {t('invoice.tableApt.empty')}
            </td></tr>
          ) : rows.map((r, i) => {
            const isAptScope = !r.isBuildingScope
            const dkLabel = t(`distributionKeys.${r.distKey || 'equal'}.label`)
            const keyText = isAptScope
              ? t('invoice.tableApt.apartmentScope')
              : `${dkLabel} · ${r.keyLabel || ''}`
            return (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{r.name}</td>
                <td className="key">{keyText}</td>
                <td className="num">{formatMoney(r.totalCost)}</td>
                <td className="num" style={{ fontWeight: 600 }}>{formatMoney(r.share)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="inv-totals">
        <div className="row sum">
          <span>{t('invoice.totalsApt.totalBillable')}</span>
          <span>{formatMoney(data.totalBillable)}</span>
        </div>
        <div className="row prepay">
          <span>{t('invoice.totalsApt.deductPrepay')}</span>
          <span>− {formatMoney(data.totalVorauszahlung)}</span>
        </div>
        <div className={`row result ${isNach ? 'nach' : isGut ? 'gut' : ''}`}>
          <span>
            {isNach
              ? t('invoice.totalsApt.resultPay')
              : isGut
                ? t('invoice.totalsApt.resultRefund')
                : t('invoice.totalsApt.resultBalanced')}
          </span>
          <span>{formatMoney(Math.abs(data.difference))}</span>
        </div>
      </div>
    </>
  )
}

/* ── Building Mode Breakdown ── */
function BuildingBreakdown({ data, t, aptLabelText }) {
  const cats = data.byCategory || []
  const aptRows = data.apartmentRows || []
  const isNach = data.difference > 0.005
  const isGut  = data.difference < -0.005

  return (
    <>
      <h2 className="inv-section-h">{t('invoice.section.categoryTotalsPrefix')} <em>{t('invoice.section.categoryTotalsEm')}</em></h2>
      <table className="inv-table" style={{ marginBottom: 28 }}>
        <thead>
          <tr>
            <th>{t('invoice.tableBld.item')}</th>
            <th>{t('invoice.tableBld.key')}</th>
            <th className="num">{t('invoice.tableBld.total')}</th>
          </tr>
        </thead>
        <tbody>
          {cats.length === 0 ? (
            <tr><td colSpan={3} style={{ textAlign:'center', color:'#8a847b', fontStyle:'italic', padding:'20px 4px' }}>
              {t('invoice.tableBld.empty')}
            </td></tr>
          ) : cats.map((c, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 500 }}>{c.name}</td>
              <td className="key">{t(`distributionKeys.${c.distKey || 'equal'}.label`)}</td>
              <td className="num" style={{ fontWeight: 600 }}>{formatMoney(c.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="inv-section-h">{t('invoice.section.distByAptPrefix')} <em>{t('invoice.section.distByAptEm')}</em></h2>
      <table className="inv-table">
        <thead>
          <tr>
            <th>{t('invoice.tableBld.apt')}</th>
            <th>{t('invoice.tableBld.tenant')}</th>
            <th className="num">{t('invoice.tableBld.billable')}</th>
            <th className="num">{t('invoice.tableBld.aidat')}</th>
            <th className="num">{t('invoice.tableBld.diff')}</th>
          </tr>
        </thead>
        <tbody>
          {aptRows.map((r, i) => {
            const dColor = r.difference > 0 ? '#8b2e1f' : r.difference < 0 ? '#2d5a3f' : '#1c1a17'
            const sign = r.difference > 0 ? '+' : r.difference < 0 ? '−' : ''
            return (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{aptLabelText(r.apt)}</td>
                <td style={{ color: r.tenant ? '#1c1a17' : '#bbb4a6' }}>{r.tenant?.full_name || t('invoice.tableBld.emptyApt')}</td>
                <td className="num">{formatMoney(r.totalBillable)}</td>
                <td className="num" style={{ color:'#4a4641' }}>{formatMoney(r.totalVorauszahlung)}</td>
                <td className="num" style={{ fontWeight: 700, color: dColor }}>
                  {sign}{formatMoney(Math.abs(r.difference))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="inv-totals">
        <div className="row sum">
          <span>{t('invoice.totalsBld.totalBillable')}</span>
          <span>{formatMoney(data.totalBillable)}</span>
        </div>
        <div className="row prepay">
          <span>{t('invoice.totalsBld.deductPrepay')}</span>
          <span>− {formatMoney(data.totalVorauszahlung)}</span>
        </div>
        <div className={`row result ${isNach ? 'nach' : isGut ? 'gut' : ''}`}>
          <span>
            {isNach
              ? t('invoice.totalsBld.resultPay')
              : isGut
                ? t('invoice.totalsBld.resultRefund')
                : t('invoice.totalsBld.resultBalanced')}
          </span>
          <span>{formatMoney(Math.abs(data.difference))}</span>
        </div>
      </div>
    </>
  )
}
