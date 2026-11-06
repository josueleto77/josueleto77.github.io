# OpsBoss

CRM de operaciones para **Nexis Power** (Solar · Roofing · HVAC).
App estática (sin build) publicada en GitHub Pages: `https://josueleto77.github.io/opsboss/`.

| Archivo | Qué es |
|---|---|
| `index.html`, `app.js`, `styles.css` | La app del equipo |
| `portal.html`, `portal.js` | Portal del cliente: ver, firmar y pagar estimados y facturas |
| `config.js` | URL y clave **publicable** de Supabase (nunca la secreta) |
| `supabase/schema.sql` | Tablas, seguridad (RLS) y tiempo real |
| `supabase/portal.sql` | Portal del cliente: links, firmas, pagos |
| `supabase/functions/opsboss-pay` | Crea el pago en Stripe Checkout (monto calculado en el servidor) |
| `supabase/functions/opsboss-stripe-webhook` | Recibe la confirmación de Stripe y registra el pago |

Proyecto de Supabase: `opsboss` (organización Nexis, ref `nkmgpsbqmqwlsaxtbgaq`). Todo ya está instalado.

## Portal del cliente

1. En un estimado o factura, haz clic en **🔗 Enviar link para firmar** o **🔗 Link de pago**.
2. Envía el link por SMS o email. El cliente no necesita cuenta.
3. El cliente elige una opción, firma con el dedo y aprueba. Se guarda la firma con nombre, fecha, IP y navegador.
4. Si el estimado pide depósito, se crea la factura del depósito al instante. OpsBoss crea el trabajo y dispara los workflows.
5. El cliente paga con tarjeta o ACH (si activaste Stripe) o ve tus otras formas de pago.

En OpsBoss ves cuántas veces abrió el link, la firma y los pagos, todo en tiempo real.

## Activar pagos en línea con Stripe (una sola vez)

1. **Stripe → Developers → API keys:** copia la *Secret key* (`sk_live_...`, o `sk_test_...` para probar).
2. **Supabase → proyecto opsboss → Edge Functions → Secrets:** agrega `STRIPE_SECRET_KEY` con ese valor.
3. **Stripe → Developers → Webhooks → Add endpoint:**
   - URL: `https://nkmgpsbqmqwlsaxtbgaq.supabase.co/functions/v1/opsboss-stripe-webhook`
   - Eventos: `checkout.session.completed` y `checkout.session.async_payment_succeeded`
   - Copia el *Signing secret* (`whsec_...`).
4. **Supabase → Edge Functions → Secrets:** agrega `STRIPE_WEBHOOK_SECRET` con ese valor.
5. **OpsBoss → Configuración → Portal del cliente:** marca **Aceptar pagos con tarjeta / ACH**.
6. *(Opcional)* **Stripe → Settings → Payment methods:** activa *ACH Direct Debit*. Para proyectos grandes cuesta mucho menos que la tarjeta.

Nunca pegues la secret key en el código, en `config.js` ni en un chat: va solo en los Secrets de Supabase.
