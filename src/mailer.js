// src/mailer.js
// ─────────────────────────────────────────────────────────────
// Envío de emails con Resend
// En desarrollo (NODE_ENV=development) imprime el código en
// consola en lugar de enviarlo, para que puedas probar sin
// tener un dominio verificado ni gastar la cuota.
// ─────────────────────────────────────────────────────────────

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = `${process.env.FROM_NAME ?? 'OficioMX'} <${process.env.FROM_EMAIL ?? 'onboarding@resend.dev'}>`
const IS_DEV = process.env.NODE_ENV !== 'production'

// ── Plantilla HTML del correo OTP ────────────────────────────
function otpTemplate(code, contextLabel) {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head><meta charset="UTF-8"></head>
  <body style="margin:0;padding:0;background:#F7F5F0;font-family:'Helvetica Neue',Arial,sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:40px 16px">
        <table width="480" cellpadding="0" cellspacing="0"
               style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E2DDD5">

          <!-- Header -->
          <tr>
            <td style="background:#1F6B4E;padding:24px 32px">
              <span style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px">
                Oficio<span style="color:rgba(255,255,255,.6)">MX</span>
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px">
              <p style="margin:0 0 8px;font-size:14px;color:#6B6860">${contextLabel}</p>
              <p style="margin:0 0 24px;font-size:16px;color:#1A1916;line-height:1.5">
                Usa el siguiente código para completar tu verificación.<br>
                <strong>Válido por 10 minutos.</strong>
              </p>

              <!-- Código grande -->
              <div style="background:#E3F2EC;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px">
                <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#1F6B4E">
                  ${code}
                </span>
              </div>

              <p style="margin:0;font-size:13px;color:#9E9B95;line-height:1.6">
                Si no solicitaste este código, ignora este correo.<br>
                Nunca compartas este código con nadie.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F7F5F0;padding:16px 32px;border-top:1px solid #E2DDD5">
              <p style="margin:0;font-size:12px;color:#9E9B95">
                OficioMX · Tlaxcala, México<br>
                Este es un correo automático, no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </body>
  </html>
  `
}

// ── Función principal ─────────────────────────────────────────
export async function sendOtpEmail(to, code, contextLabel = 'Verificación de correo electrónico') {
  if (IS_DEV) {
    // En desarrollo: imprime en consola, no gasta cuota de Resend
    console.log('\n─────────────────────────────────────')
    console.log(`[DEV] OTP para ${to}: ${code}`)
    console.log(`[DEV] Contexto: ${contextLabel}`)
    console.log('─────────────────────────────────────\n')
    return { ok: true, dev: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from:    FROM,
      to:      [to],
      subject: `Tu código de verificación OficioMX: ${code}`,
      html:    otpTemplate(code, contextLabel),
    })

    if (error) {
      console.error('[Resend error]', error)
      return { ok: false, error: error.message }
    }

    return { ok: true, emailId: data.id }
  } catch (err) {
    console.error('[Resend exception]', err)
    return { ok: false, error: 'Error enviando correo' }
  }
}
