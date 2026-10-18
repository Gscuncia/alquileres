export const WHATSAPP_NUMBER = "5491155052228";

export const DEFAULT_CONTACT_EMAIL = "contacto@alquileresanita.com.ar";

export function buildWhatsAppUrl(propertyTitle: string, number: string = WHATSAPP_NUMBER): string {
  const message = `Hola, quiero consultar por el alojamiento ${propertyTitle}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function buildEmailUrl(propertyTitle: string, to: string = DEFAULT_CONTACT_EMAIL): string {
  const subject = `Consulta por ${propertyTitle}`;
  return `mailto:${to}?subject=${encodeURIComponent(subject)}`;
}
