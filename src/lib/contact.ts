export const WHATSAPP_NUMBER = "5491155052228";

export function buildWhatsAppUrl(propertyTitle: string): string {
  const message = `Hola, quiero consultar por el alojamiento ${propertyTitle}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function buildEmailUrl(propertyTitle: string): string {
  const subject = `Consulta por ${propertyTitle}`;
  return `mailto:contacto@alquileresanita.com.ar?subject=${encodeURIComponent(subject)}`;
}
