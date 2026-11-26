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

## Conectar QuickBooks Online (una sola vez)

OpsBoss lee QuickBooks en modo solo lectura (facturas, pagos, notas de crédito, facturas de proveedor, gastos y depósitos). No escribe nada en QuickBooks.

1. En https://developer.intuit.com crea una app con el alcance **Accounting**.
2. En la app, agrega esta Redirect URI:
   `https://nkmgpsbqmqwlsaxtbgaq.supabase.co/functions/v1/opsboss-qbo`
3. En Supabase → Edge Functions → Secrets agrega `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET` y `QBO_ENV` (`production` o `sandbox`).
4. En OpsBoss → Accounting (QuickBooks) → **Connect QuickBooks** y luego **Sync now**.

Mientras tanto se puede importar el CSV de QuickBooks (Reports → Transaction List by Date → Export). Repetir la importación no duplica registros.

## HighLevel: fuentes de leads y citas

En Settings → **Lead sources** cada fuente (Website, Meta, HVAC forms, Solar calendar, Last English Form 2026 v2) tiene su propia URL de webhook. Pega cada URL en el workflow de HighLevel correspondiente (acción Webhook, POST). También hay URLs para citas (agendada / reprogramada / cancelada) y para bajas (DND). Usa **Verify IDs in HighLevel** para comprobar que los IDs de formularios y calendarios siguen vigentes.

Los mensajes automáticos empiezan en **modo de prueba**: no se envían hasta activar “Automatic outbound messages” en Settings.

## Pruebas

Sirve la raíz del repo (`python3 -m http.server 8765`) y ejecuta:
`node opsboss/tests/acceptance-financial.js` y `node opsboss/tests/phase3.js`.

## Campo y posventa (Fase 4)

- **Field work orders** (menú Field): cada trabajo abre su orden móvil con alcance, tareas, fotos, horas (reloj de entrada/salida), materiales, números de serie, reporte de problemas y firma del cliente. Las fotos tomadas sin señal se guardan en el teléfono y se suben solas al volver la conexión (o con “Retry now”).
- Al **completar** una instalación se crea el paquete de entrega (PDF), se piden las tareas que falten (fotos, series, inspecciones, firma), arrancan las garantías y el equipo queda en la ficha del cliente.
- **Service & warranties**: tickets ligados al proyecto y al equipo, visita en el calendario, tiempo y repuestos, costo de garantía cargado al proyecto original o factura al cliente.
- **Portal del proyecto**: en el proyecto, botón “Customer portal” → link para el cliente con avance, visitas, documentos, facturas/pagos, garantías y solicitudes de servicio (sin costos ni notas internas).
- Prueba: `node opsboss/tests/phase4.js`.
