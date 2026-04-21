/* ── KiraciYonet — Fatura Önizleme (editorial paper, print-ready) ──
 *
 * Yan Gider Hesap Kesimi'nin kâğıt halini tarayıcı-yazdır akışı için sunar.
 * Modal chrome `data-no-print`; gerçek paper `.invoice-paper`. @media print
 * kurallarıyla yalnızca paper basılır → kullanıcı "Yazdır" → "Microsoft Print
 * to PDF" ile kaydeder.
 */

import { motion } from 'motion/react'
import { Printer, X, ArrowLeft } from 'lucide-react'
import { apartmentLabel } from '../lib/apartmentLabel'
import { householdSize } from '../lib/householdSize'

const fmt2 = (n) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d) => {
  if (!d) return '—'
  const dt = d instanceof Date ? d : new Date(d)
  if (isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
const fmtStamp = (d) => {
  const dt = d instanceof Date ? d : new Date(d)
  return dt.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const DK_LABEL = {
  equal:   'Eşit Pay',
  area:    'Konut Alanı (m²)',
  persons: 'Kişi Sayısı',
  units:   'Daire Sayısı',
}

export default function InvoicePreview({
  data,
  start,
  end,
  apartments = [],
  tenantsByApt = {},
  landlordEmail = '',
  onClose,
  onBackToEdit,
}) {
  if (!data) return null

  const isApt = data.mode !== 'building'
  const periodLabel = `${fmtDate(start)} – ${fmtDate(end)}`
  const issueStamp  = fmtStamp(new Date())
  const issueDate   = fmtDate(new Date())
  const invoiceNo   = `NKA-${new Date(start).getFullYear()}-${(Date.now() % 10000).toString().padStart(4, '0')}`

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

  // Print
  const handlePrint = () => window.print()

  // ─── Render: Backdrop + Paper ───
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Instrument+Sans:wght@400;500;600&display=swap');

        .invoice-backdrop {
          position: fixed;
          top: 60px;
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
        body.collapsed .invoice-backdrop { left: var(--sb-w-col); }
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

        /* Top stamp + title */
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

        /* Parties */
        .inv-parties {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 36px;
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

        /* Property info bar */
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

        /* Breakdown table */
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

        /* Building-mode specific */
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

        /* PRINT */
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
        {/* TOOLBAR (chrome — print'te gizlenir) */}
        <div className="invoice-toolbar" data-no-print>
          <div className="ttl">Yan Giderler <em>Hesabı</em></div>
          <div className="actions">
            <button className="btn-ghost" onClick={onBackToEdit || onClose}>
              <ArrowLeft size={14} /> Düzenle
            </button>
            <button className="btn-primary" onClick={handlePrint}>
              <Printer size={14} /> Yazdır / PDF Kaydet
            </button>
            <button className="icon-btn" onClick={onClose} aria-label="Kapat">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* PAPER (print'te tek görünen kısım) */}
        <motion.div
          className="invoice-paper"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        >
          {/* TOP STAMP + TITLE + PERIOD */}
          <div className="inv-top">
            <div className="inv-stamp">{issueStamp}</div>
            <h1 className="inv-title">Yan Giderler <em>Hesabı</em></h1>
            <div className="inv-period">
              Hesap Dönemi
              <strong>{periodLabel}</strong>
              <div className="meta-no">No. {invoiceNo}</div>
            </div>
          </div>

          {/* PARTIES */}
          <div className="inv-parties">
            <div>
              <h3>Ev Sahibi</h3>
              <div className="party-body">{landlordEmail || 'Mülk Sahibi'}</div>
            </div>
            <div>
              <h3>Kiracı</h3>
              <div className="party-body">
                {isApt
                  ? (tenant?.full_name || 'Aktif kiracı yok')
                  : `${data.apartmentRows?.length || 0} daire / ${data.apartmentRows?.filter(r => r.tenant).length || 0} aktif kiracı`}
              </div>
            </div>
          </div>

          {/* PROPERTY INFO */}
          {isApt ? (
            <div className="inv-property">
              <div className="kv">
                <label>Kiralık Mülk</label>
                <span>{`${buildingName}, ${apartmentLabel(apt)}`}</span>
              </div>
              <div className="kv">
                <label>Konut Alanı</label>
                <span>{aptArea > 0 ? `${fmt2(aptArea)} / ${fmt2(totalAreaInBuilding || aptArea)} m²` : '—'}</span>
              </div>
              <div className="kv">
                <label>Kişi Sayısı</label>
                <span>{aptPersons > 0 ? `${aptPersons} / ${totalPersons || aptPersons}` : '—'}</span>
              </div>
            </div>
          ) : (
            <div className="inv-property">
              <div className="kv">
                <label>Bina</label>
                <span>{data.building?.name || '—'}</span>
              </div>
              <div className="kv">
                <label>Daire Sayısı</label>
                <span>{data.apartmentRows?.length || 0}</span>
              </div>
              <div className="kv">
                <label>Hesap Süresi</label>
                <span>{data.monthsInPeriod} Ay</span>
              </div>
            </div>
          )}

          {/* BREAKDOWN — apartment veya building summary */}
          {isApt ? (
            <ApartmentBreakdown data={data} />
          ) : (
            <BuildingBreakdown data={data} />
          )}

          {/* FOOTER NOTE */}
          <div className="inv-footer">
            <strong>Açıklama:</strong> Bu hesap, kiracı ile mutabık kalınan dağıtım anahtarlarına göre düzenlenmiştir.
            Belirtilen giderler, hesap döneminde fiilen gerçekleşen işletme giderlerine karşılık gelmektedir.
            <br /><br />
            {data.difference > 0.005 ? (
              <>Lütfen <strong>{fmt2(Math.abs(data.difference))} ₺ tutarındaki ek ödeme bedelini</strong>, bu hesabın tarafınıza ulaşmasından itibaren 30 gün içinde havale ediniz.</>
            ) : data.difference < -0.005 ? (
              <><strong>{fmt2(Math.abs(data.difference))} ₺</strong> tutarındaki alacağınız 30 gün içinde tarafınıza iade edilecek veya bir sonraki kira ödemenizden mahsup edilecektir.</>
            ) : (
              <>Peşin ödemeleriniz yan giderleri tam olarak karşılamaktadır.</>
            )}
            <br /><br />
            Hesaba yapılacak itirazların, hesabın tarafınıza ulaşmasından itibaren 12 ay içinde yazılı olarak bildirilmesi gerekmektedir. Belgeler randevu ile incelenebilir.
            <br /><br />
            <span style={{ fontSize: 10, color: '#bbb4a6' }}>Düzenleme Tarihi: {issueDate} · KiraciYonet</span>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}

/* ── Apartment Mode Breakdown ── */
function ApartmentBreakdown({ data }) {
  const rows = data.byCategory || []
  const isNach = data.difference > 0.005
  const isGut  = data.difference < -0.005

  return (
    <>
      <table className="inv-table">
        <thead>
          <tr>
            <th>Kalem</th>
            <th>Anahtar</th>
            <th className="num">Toplam (₺)</th>
            <th className="num">Sizin Payınız (₺)</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} style={{ textAlign:'center', color:'#8a847b', fontStyle:'italic', padding:'20px 4px' }}>
              Bu dönemde yansıtılabilir gider bulunamadı.
            </td></tr>
          ) : rows.map((r, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 500 }}>{r.name}</td>
              <td className="key">
                {r.keyLabel === 'Daire özel'
                  ? 'Daire Özel'
                  : `${DK_LABEL[r.distKey] || 'Eşit Pay'} · ${r.keyLabel || ''}`}
              </td>
              <td className="num">{fmt2(r.totalCost)} ₺</td>
              <td className="num" style={{ fontWeight: 600 }}>{fmt2(r.share)} ₺</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="inv-totals">
        <div className="row sum">
          <span>Toplam Yan Gideriniz</span>
          <span>{fmt2(data.totalBillable)} ₺</span>
        </div>
        <div className="row prepay">
          <span>Ödenmiş peşin ödemeler düşülür</span>
          <span>− {fmt2(data.totalVorauszahlung)} ₺</span>
        </div>
        <div className={`row result ${isNach ? 'nach' : isGut ? 'gut' : ''}`}>
          <span>{isNach ? 'Ek Ödeme' : isGut ? 'Alacak (Kiracı Lehine)' : 'Denk'}</span>
          <span>{fmt2(Math.abs(data.difference))} ₺</span>
        </div>
      </div>
    </>
  )
}

/* ── Building Mode Breakdown ── */
function BuildingBreakdown({ data }) {
  const cats = data.byCategory || []
  const aptRows = data.apartmentRows || []
  const isNach = data.difference > 0.005
  const isGut  = data.difference < -0.005

  return (
    <>
      <h2 className="inv-section-h">Kategori <em>Toplamları</em></h2>
      <table className="inv-table" style={{ marginBottom: 28 }}>
        <thead>
          <tr>
            <th>Kalem</th>
            <th>Anahtar</th>
            <th className="num">Toplam (₺)</th>
          </tr>
        </thead>
        <tbody>
          {cats.length === 0 ? (
            <tr><td colSpan={3} style={{ textAlign:'center', color:'#8a847b', fontStyle:'italic', padding:'20px 4px' }}>
              Bu dönemde yansıtılabilir gider bulunamadı.
            </td></tr>
          ) : cats.map((c, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 500 }}>{c.name}</td>
              <td className="key">{DK_LABEL[c.distKey] || 'Eşit Pay'}</td>
              <td className="num" style={{ fontWeight: 600 }}>{fmt2(c.total)} ₺</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="inv-section-h">Daire Bazlı <em>Dağılım</em></h2>
      <table className="inv-table">
        <thead>
          <tr>
            <th>Daire</th>
            <th>Kiracı</th>
            <th className="num">Yansıtılabilir (₺)</th>
            <th className="num">Aidat (₺)</th>
            <th className="num">Fark (₺)</th>
          </tr>
        </thead>
        <tbody>
          {aptRows.map((r, i) => {
            const dColor = r.difference > 0 ? '#8b2e1f' : r.difference < 0 ? '#2d5a3f' : '#1c1a17'
            const sign = r.difference > 0 ? '+' : r.difference < 0 ? '−' : ''
            const floor = r.apt?.floor_no ? `Kat ${r.apt.floor_no} · ` : ''
            return (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{floor}Daire {r.apt?.unit_no || '—'}</td>
                <td style={{ color: r.tenant ? '#1c1a17' : '#bbb4a6' }}>{r.tenant?.full_name || '— boş —'}</td>
                <td className="num">{fmt2(r.totalBillable)} ₺</td>
                <td className="num" style={{ color:'#4a4641' }}>{fmt2(r.totalVorauszahlung)} ₺</td>
                <td className="num" style={{ fontWeight: 700, color: dColor }}>
                  {sign}{fmt2(Math.abs(r.difference))} ₺
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="inv-totals">
        <div className="row sum">
          <span>Bina Toplam Yansıtılabilir</span>
          <span>{fmt2(data.totalBillable)} ₺</span>
        </div>
        <div className="row prepay">
          <span>Toplanmış aidat ödemeleri düşülür</span>
          <span>− {fmt2(data.totalVorauszahlung)} ₺</span>
        </div>
        <div className={`row result ${isNach ? 'nach' : isGut ? 'gut' : ''}`}>
          <span>{isNach ? 'Açık (Bina Lehine)' : isGut ? 'Fazlalık (Kiracılar Lehine)' : 'Denk'}</span>
          <span>{fmt2(Math.abs(data.difference))} ₺</span>
        </div>
      </div>
    </>
  )
}
