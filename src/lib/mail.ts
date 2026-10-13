import nodemailer from "nodemailer";
import type { Transporter, SendMailOptions } from "nodemailer";

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
      `[mail] SMTP not configured. Welcome email would have been sent to ${email}`,
    );
  }
}
