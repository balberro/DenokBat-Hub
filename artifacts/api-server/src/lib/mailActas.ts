import nodemailer from "nodemailer";

function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_PORT?.trim() &&
      process.env.SMTP_FROM?.trim(),
  );
}

/**
 * Envía un correo con el acta (HTML + texto plano) a la lista de destinatarios.
 * Si SMTP no está configurado, registra en log y devuelve `{ ok: true, simulado: true }`
 * para que el flujo de UI pueda seguir.
 */
export async function sendActaEmail(opts: {
  to: string[];
  subject: string;
  text: string;
  html: string;
  bcc?: string[];
  replyTo?: string;
}): Promise<{ ok: boolean; simulado?: boolean; error?: string }> {
  const to = opts.to.filter((x) => typeof x === "string" && x.trim().length > 0);
  if (to.length === 0) {
    return { ok: false, error: "Sin destinatarios válidos." };
  }
  if (!smtpConfigured()) {
    console.info(
      `[mail actas] SMTP no configurado; envío simulado a ${to.length} destinatarios. Asunto: ${opts.subject}`,
    );
    return { ok: true, simulado: true };
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
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM!.trim(),
      to,
      bcc: opts.bcc,
      replyTo: opts.replyTo,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return { ok: true };
  } catch (err) {
    console.error("[mail actas] error enviando", err);
    return { ok: false, error: String((err as Error)?.message ?? err) };
  }
}
