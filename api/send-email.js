/* ── KiraciYonet — E-posta Gonderim API (Vercel Serverless) ── */

const RESEND_API = 'https://api.resend.com/emails'

/* ── Mail sablonlari ── */
const TEMPLATES = {
  reminder: (tenantName, amount, dueDate, landlordName) => ({
    subject: `Kira Hatirlatmasi — ${dueDate}`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
        <div style="background: #1E293B; color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0; font-size: 18px;">KiraciYonet</h2>
        </div>
        <div style="background: white; border: 1px solid #E2E8F0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Sayin <strong>${tenantName}</strong>,
          </p>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            <strong>${dueDate}</strong> tarihinde <strong>${amount} TL</strong> tutarindaki kira odemeniz bulunmaktadir.
          </p>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Lutfen odemenizi zamaninda yapiniz.
          </p>
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
          <p style="color: #94A3B8; font-size: 13px;">
            Bu e-posta ${landlordName} tarafindan KiraciYonet uzerinden gonderilmistir.
          </p>
        </div>
      </div>
    `
  }),

  due_today: (tenantName, amount, landlordName) => ({
    subject: `Kira Odeme Gunu — Bugun`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
        <div style="background: #1E293B; color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0; font-size: 18px;">KiraciYonet</h2>
        </div>
        <div style="background: white; border: 1px solid #E2E8F0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Sayin <strong>${tenantName}</strong>,
          </p>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Bugun <strong>${amount} TL</strong> tutarindaki kira odeme gununuzdur.
          </p>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Lutfen odemenizi bugun icinde yapiniz.
          </p>
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
          <p style="color: #94A3B8; font-size: 13px;">
            Bu e-posta ${landlordName} tarafindan KiraciYonet uzerinden gonderilmistir.
          </p>
        </div>
      </div>
    `
  }),

  overdue: (tenantName, amount, dueDate, daysLate, landlordName) => ({
    subject: `Geciken Kira Odemesi — ${daysLate} Gun`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
        <div style="background: #DC2626; color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0; font-size: 18px;">KiraciYonet — Gecikme Uyarisi</h2>
        </div>
        <div style="background: white; border: 1px solid #E2E8F0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Sayin <strong>${tenantName}</strong>,
          </p>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            <strong>${dueDate}</strong> tarihli <strong>${amount} TL</strong> tutarindaki kira odemeniz <strong style="color: #DC2626;">${daysLate} gundur gecikme</strong> gostermektedir.
          </p>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Lutfen en kisa surede odemenizi yapiniz.
          </p>
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
          <p style="color: #94A3B8; font-size: 13px;">
            Bu e-posta ${landlordName} tarafindan KiraciYonet uzerinden gonderilmistir.
          </p>
        </div>
      </div>
    `
  }),

  payment_received: (tenantName, amount, paidDate, landlordName) => ({
    subject: `Kira Odemesi Alindi — Tesekkurler`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
        <div style="background: #16A34A; color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0; font-size: 18px;">KiraciYonet — Odeme Onay</h2>
        </div>
        <div style="background: white; border: 1px solid #E2E8F0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Sayin <strong>${tenantName}</strong>,
          </p>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            <strong>${paidDate}</strong> tarihinde <strong>${amount} TL</strong> tutarindaki kira odemeniz basariyla alindi.
          </p>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Tesekkur ederiz.
          </p>
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
          <p style="color: #94A3B8; font-size: 13px;">
            Bu e-posta ${landlordName} tarafindan KiraciYonet uzerinden gonderilmistir.
          </p>
        </div>
      </div>
    `
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' })
  }

  const { type, tenantName, tenantEmail, amount, dueDate, paidDate, daysLate, landlordName } = req.body

  if (!type || !tenantEmail || !tenantName) {
    return res.status(400).json({ error: 'Missing required fields: type, tenantEmail, tenantName' })
  }

  /* Sablonu sec */
  let template
  const formattedAmount = Number(amount).toLocaleString('tr-TR')

  switch (type) {
    case 'reminder':
      template = TEMPLATES.reminder(tenantName, formattedAmount, dueDate, landlordName || 'Mulk Sahibi')
      break
    case 'due_today':
      template = TEMPLATES.due_today(tenantName, formattedAmount, landlordName || 'Mulk Sahibi')
      break
    case 'overdue':
      template = TEMPLATES.overdue(tenantName, formattedAmount, dueDate, daysLate, landlordName || 'Mulk Sahibi')
      break
    case 'payment_received':
      template = TEMPLATES.payment_received(tenantName, formattedAmount, paidDate, landlordName || 'Mulk Sahibi')
      break
    default:
      return res.status(400).json({ error: 'Invalid email type' })
  }

  try {
    const response = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'KiraciYonet <onboarding@resend.dev>',
        to: [tenantEmail],
        subject: template.subject,
        html: template.html
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Mail gonderilemedi', status: 'failed' })
    }

    return res.status(200).json({ success: true, id: data.id, status: 'sent' })
  } catch (err) {
    return res.status(500).json({ error: err.message, status: 'failed' })
  }
}
