"use client";

import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import { Button } from "@/components/design-system";
import {
  AdminField,
  AdminInput,
} from "@/components/admin/primitives";

interface ContactSettingsFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initialInquiryEmail: string;
  initialWhatsappPhone: string;
  initialBackupEmail: string;
  initialBackupHour: number;
}

export function ContactSettingsForm({
  action,
  initialInquiryEmail,
  initialWhatsappPhone,
  initialBackupEmail,
  initialBackupHour,
}: ContactSettingsFormProps) {
  const [state, formAction] = useFormState(action, { ok: false });

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {state.ok && (
        <div
          role="status"
          className="rounded-sm border border-hairline bg-sky px-4 py-3 text-body-sm text-ink md:col-span-2"
        >
          Los cambios se guardaron correctamente.
        </div>
      )}
      {!state.ok && state.message && (
        <div
          role="alert"
          className="rounded-sm border border-hairline bg-surface-soft px-4 py-3 text-body-sm text-primary-error-text md:col-span-2"
        >
          {state.message}
        </div>
      )}
      <AdminField
        label="Email de destino de las consultas"
        htmlFor="inquiryEmail"
        error={state.fieldErrors?.inquiryEmail}
      >
        <AdminInput
          id="inquiryEmail"
          name="inquiryEmail"
          type="email"
          defaultValue={initialInquiryEmail}
        />
        <p className="mt-1 text-caption-sm text-muted">
          Los mensajes del formulario de contacto llegan a esta dirección.
        </p>
      </AdminField>
      <AdminField
        label="WhatsApp de destino"
        htmlFor="whatsappPhone"
        error={state.fieldErrors?.whatsappPhone}
      >
        <AdminInput
          id="whatsappPhone"
          name="whatsappPhone"
          type="tel"
          defaultValue={initialWhatsappPhone}
        />
        <p className="mt-1 text-caption-sm text-muted">
          Código país + número, solo dígitos (ej.: 5491155052228). Aparece en los
          botones de contacto de cada propiedad y en «Contacto».
        </p>
      </AdminField>
      <AdminField
        label="Email donde llegan los backups"
        htmlFor="backupEmail"
        error={state.fieldErrors?.backupEmail}
      >
        <AdminInput
          id="backupEmail"
          name="backupEmail"
          type="email"
          defaultValue={initialBackupEmail}
        />
        <p className="mt-1 text-caption-sm text-muted">
          Todos los días a la hora configurada abajo (hora argentina) llega un
          mail con los CSV de huéspedes y reservas. Vacío = el propio Gmail del
          proyecto.
        </p>
      </AdminField>
      <AdminField
        label="Hora de envío del backup (hora argentina)"
        htmlFor="backupHour"
        error={state.fieldErrors?.backupHour}
      >
        <AdminInput
          as="select"
          id="backupHour"
          name="backupHour"
          defaultValue={initialBackupHour}
        >
          {Array.from({ length: 24 }, (_, hour) => (
            <option key={hour} value={hour}>
              {`${hour}:00`}
            </option>
          ))}
        </AdminInput>
        <p className="mt-1 text-caption-sm text-muted">
          El backup sale cerca de esta hora. Se envía una vez por día.
        </p>
      </AdminField>
      <div className="md:col-span-2">
        <Button type="submit">Guardar cambios</Button>
      </div>
    </form>
  );
}
