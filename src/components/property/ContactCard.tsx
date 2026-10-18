import React from "react";
import { Button } from "@/components/design-system";
import { buildWhatsAppUrl, buildEmailUrl } from "@/lib/contact";
import { getContactSettings } from "@/lib/site-settings";

export interface ContactCardProps {
  propertyTitle: string;
}

export async function ContactCard({ propertyTitle }: ContactCardProps) {
  const { inquiryEmail, whatsappPhone } = await getContactSettings();

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
          <a href={buildEmailUrl(propertyTitle, inquiryEmail)}>Contactar por email</a>
        </Button>
      </div>
    </div>
  );
}
