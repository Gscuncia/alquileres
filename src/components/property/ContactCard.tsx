import React from "react";
import Link from "next/link";
import { Button } from "@/components/design-system";
import { buildWhatsAppUrl } from "@/lib/contact";
import { getContactSettings } from "@/lib/site-settings";

export interface ContactCardProps {
  propertyTitle: string;
}

export async function ContactCard({ propertyTitle }: ContactCardProps) {
  const { whatsappPhone } = await getContactSettings();

  return (
    <div className="rounded-lg border border-hairline bg-canvas p-6 shadow-card">
      <div className="space-y-3">
        <Button asChild variant="primary" block>
          <a
            href={buildWhatsAppUrl(propertyTitle, whatsappPhone)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Contactar por WhatsApp
          </a>
        </Button>

        <Button asChild variant="secondary" block>
          {/* The site's contact form instead of a mailto: device mail apps are
              unreliable on phones; the form prefills the property query. */}
          <Link href={`/contacto?propiedad=${encodeURIComponent(propertyTitle)}`}>
            Contactar por email
          </Link>
        </Button>
      </div>
    </div>
  );
}
