import nodemailer from "nodemailer";

const DEFAULT_TO = "info@denokbat.com";

function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_PORT?.trim() &&
      process.env.SMTP_FROM?.trim(),
  );
}

/**
 * Si `SUGERENCIAS_FROM_USER` está activa (1/true), el `From:` del email lleva
 * la dirección del usuario que envía la sugerencia. Es lo que el receptor
 * ve como remitente; pero muchos SMTP rechazarán envíos cuyo `From` no
 * coincida con el dominio autenticado (SPF/DKIM). Si te lo rechazan, pon
 * `SUGERENCIAS_FROM_USER=0` y el `From` será el SMTP_FROM oficial mientras
 * que el `Reply-To` apuntará igualmente al usuario.
 */
function debeUsarFromUsuario(): boolean {
  const raw = (process.env.SUGERENCIAS_FROM_USER ?? "1").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "si";
}

function sanitizeName(name: string | null | undefined): string {
  if (!name) return "";
  // Evita romper la cabecera con comillas/comas raras.
  return name.replace(/[\r\n]/g, "").replace(/"/g, "'").trim();
}

function composeFrom(opts: {
  fromEmail?: string | null;
  fromName?: string | null;
}): { from: string; replyTo?: string } {
  const fallback = (process.env.SMTP_FROM ?? "").trim();
  const email = (opts.fromEmail ?? "").trim();
  if (!email) {
    return { from: fallback };
  }
  const name = sanitizeName(opts.fromName);
  const formatted = name ? `"${name}" <${email}>` : email;
  if (debeUsarFromUsuario()) {
    // El receptor ve al usuario como remitente; respuesta directa al usuario.
    return { from: formatted, replyTo: email };
  }
  // From "oficial" del dominio, pero Reply-To al usuario.
  return { from: fallback, replyTo: formatted };
}

/** Envía aviso de nueva sugerencia o aportación. Si no hay SMTP, solo registra en log. */
export async function notifySugerenciaEmail(opts: {
  subject: string;
  text: string;
  html?: string;
  /** Email del usuario que origina la sugerencia (público o socio). */
  fromEmail?: string | null;
  /** Nombre del usuario que origina la sugerencia (opcional). */
  fromName?: string | null;
}): Promise<void> {
  const to = (process.env.SUGERENCIAS_NOTIFY_EMAIL ?? DEFAULT_TO).trim();
  if (!smtpConfigured()) {
    console.info("[mail sugerencias] SMTP no configurado; no se envía email. Asunto:", opts.subject);
    return;
  }

  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = process.env.SMTP_SECURE === "1" || process.env.SMTP_SECURE === "true";
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!.trim(),
    port: Number.isFinite(port) ? port : 587,
    secure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER.trim(),
            pass: process.env.SMTP_PASS.trim(),
          }
        : undefined,
  });

  const { from, replyTo } = composeFrom({
    fromEmail: opts.fromEmail,
    fromName: opts.fromName,
  });

  await transporter.sendMail({
    from,
    replyTo,
    to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}
