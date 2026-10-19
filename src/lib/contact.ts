export const WHATSAPP_NUMBER = "5491155052228";

export const DEFAULT_CONTACT_EMAIL = "contacto@alquileresanita.com.ar";

export function buildWhatsAppUrl(propertyTitle: string, number: string = WHATSAPP_NUMBER): string {
  const message = `Hola, quiero consultar por el alojamiento ${propertyTitle}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Pre-filled message for the site's contact form, reached from a property. */
export function buildContactFormMessage(propertyTitle: string): string {
  return `Hola, quiero consultar por el alojamiento ${propertyTitle}`;
}
