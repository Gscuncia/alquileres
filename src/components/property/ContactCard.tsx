import React from "react";
import { Button } from "@/components/design-system";
import { buildWhatsAppUrl, buildEmailUrl } from "@/lib/contact";

export interface ContactCardProps {
  propertyTitle: string;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  propertyTitle,
}) => {
  return (
    <div className="rounded-lg border border-hairline bg-canvas p-6 shadow-card">
      <div className="space-y-3">
        <Button asChild variant="primary" block>
          <a
            href={buildWhatsAppUrl(propertyTitle)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Contactar por WhatsApp
          </a>
        </Button>

        <Button asChild variant="secondary" block>
          <a href={buildEmailUrl(propertyTitle)}>Contactar por email</a>
        </Button>
      </div>
    </div>
  );
};
