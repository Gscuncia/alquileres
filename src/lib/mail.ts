import nodemailer from "nodemailer";
import type { Transporter, SendMailOptions } from "nodemailer";
import type { BackupData } from "@/lib/backup";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function createTransporter(): Transporter | null {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
}

/**
 * Shared nodemailer transporter for transactional emails.
 * Returns `null` when `GMAIL_USER` or `GMAIL_APP_PASSWORD` are not configured.
 */
export const transporter = createTransporter();

/**
 * Send a welcome email to a newly created user with their temporary password.
 * Falls back to logging the message in development when SMTP is not configured.
 */
export async function sendWelcomeEmail(
  email: string,
  password: string,
): Promise<void> {
  const loginUrl = `${SITE_URL}/auth/signin`;

  const mailOptions: SendMailOptions = {
    from: `"Alquileres Anita" <${GMAIL_USER ?? "no-reply@alquileresanita.com.ar"}>`,
    to: email,
    subject: "Tu cuenta de Alquileres Anita",
    text: [
      "Hola,",
      "",
      "Te han creado una cuenta en el panel de administración de Alquileres Anita.",
      "",
      `Email: ${email}`,
      `Contraseña temporal: ${password}`,
      "",
      `Podés iniciar sesión aquí: ${loginUrl}`,
      "",
      "Por seguridad, se te pedirá que cambies esta contraseña en tu primer ingreso.",
      "",
      "Saludos,",
      "Equipo Alquileres Anita",
    ].join("\n"),
    html: [
      "<p>Hola,</p>",
      "<p>Te han creado una cuenta en el panel de administración de Alquileres Anita.</p>",
      "<ul>",
      `<li><strong>Email:</strong> ${email}</li>`,
      `<li><strong>Contraseña temporal:</strong> ${password}</li>`,
      "</ul>",
      `<p><a href=\"${loginUrl}\">Iniciar sesión</a></p>`,
      "<p>Por seguridad, se te pedirá que cambies esta contraseña en tu primer ingreso.</p>",
      "<p>Saludos,<br>Equipo Alquileres Anita</p>",
    ].join("\n"),
  };

  if (transporter) {
    await transporter.sendMail(mailOptions);
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      `[mail] SMTP not configured. Reset email would have been sent to ${email}`,
    );
  }
}

/**
 * Send the daily backup email with the guests and bookings CSVs attached.
 * Falls back to logging the message in development when SMTP is not configured.
 */
export async function sendBackupEmail(
  to: string,
  dateStr: string,
  backup: BackupData,
): Promise<void> {
  const mailOptions: SendMailOptions = {
    from: `"Alquileres Anita" <${GMAIL_USER ?? "no-reply@alquileresanita.com.ar"}>`,
    to,
    subject: `Backup Alquileres Anita ${dateStr}`,
    text: "Adjuntamos el backup diario de huéspedes y reservas.",
    attachments: [
      {
        filename: `huespedes-${dateStr}.csv`,
        content: backup.guests,
      },
      {
        filename: `reservas-${dateStr}.csv`,
        content: backup.bookings,
      },
    ],
  };

  if (transporter) {
    await transporter.sendMail(mailOptions);
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      `[mail] SMTP not configured. Backup email would have been sent to ${to}`,
    );
  }
}

/**
 * Send a password-reset email with a time-limited token link.
 * Falls back to logging the message in development when SMTP is not configured.
 */
export async function sendResetEmail(
  email: string,
  token: string,
  origin: string,
): Promise<void> {
  const resetUrl = `${origin}/auth/reset?token=${token}`;

  const mailOptions: SendMailOptions = {
    from: `"Alquileres Anita" <${GMAIL_USER ?? "no-reply@alquileresanita.com.ar"}>`,
    to: email,
    subject: "Recuperación de contraseña",
    text: [
      "Hola,",
      "",
      "Recibimos una solicitud para restablecer la contraseña de tu cuenta.",
      "",
      `Hacé clic en el siguiente enlace o copialo en tu navegador:`,
      resetUrl,
      "",
      "El enlace expira en 1 hora.",
      "",
      "Si no solicitaste este cambio, ignorá este mensaje.",
      "",
      "Saludos,",
      "Equipo Alquileres Anita",
    ].join("\n"),
    html: [
      "<p>Hola,</p>",
      "<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>",
      `<p><a href=\"${resetUrl}\">Restablecer contraseña</a></p>`,
      "<p>Si el enlace no funciona, copiá y pegá la siguiente dirección en tu navegador:</p>",
      `<p><code>${resetUrl}</code></p>`,
      "<p>El enlace expira en 1 hora.</p>",
      "<p>Si no solicitaste este cambio, ignorá este mensaje.</p>",
      "<p>Saludos,<br>Equipo Alquileres Anita</p>",
    ].join("\n"),
  };

  if (transporter) {
    await transporter.sendMail(mailOptions);
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      `[mail] SMTP not configured. Reset email would have been sent to ${email}`,
    );
  }
}
