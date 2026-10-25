import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { formatInTz, toDateStr } from "@/lib/datetime";
import { upsertHoliday, deleteHoliday } from "@/app/admin/holidays/actions";
import { HolidayForm } from "@/components/admin/HolidayForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import {
  AdminPanel,
  AdminEmptyState,
  AdminPageHeader,
} from "@/components/admin/primitives";
import { Button } from "@/components/design-system";

interface FeriadosPageProps {
  searchParams?: {
    feriado?: string;
  };
}

const tableCellClasses = "border-b border-hairline px-4 py-3 text-body-sm text-body";

const dateDisplayOptions: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

export default async function FeriadosPage({ searchParams }: FeriadosPageProps) {
  await requireAdmin();

  const feriadoId = searchParams?.feriado?.trim() ?? "";

  const [holidays, editingHoliday] = await Promise.all([
    prisma.holiday.findMany({ orderBy: { date: "desc" } }),
    feriadoId
      ? prisma.holiday.findUnique({ where: { id: feriadoId } })
      : Promise.resolve(null),
  ]);

  const editing = editingHoliday ?? null;

  const editingInitialValues = editing
    ? {
        id: editing.id,
        date: toDateStr(editing.date),
        notes: editing.notes,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Feriados" />

      <AdminPanel>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-title-md font-semibold text-ink">
              {editing ? "Editar feriado" : "Nuevo feriado"}
            </h3>
            {editing && (
              <Button asChild variant="tertiary">
                <Link href="/admin/feriados">Cancelar edición</Link>
              </Button>
            )}
          </div>
          <HolidayForm
            action={upsertHoliday}
            initialValues={editingInitialValues}
            submitLabel={editing ? "Guardar cambios" : "Crear feriado"}
          />
        </div>
      </AdminPanel>

      {holidays.length === 0 ? (
        <AdminEmptyState>
          Todavía no hay feriados cargados.
        </AdminEmptyState>
      ) : (
        <AdminPanel>
          <table className="w-full">
            <thead>
              <tr className="bg-surface-soft text-left">
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Fecha</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Observaciones</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((holiday) => (
                <tr key={holiday.id}>
                  <td className={`${tableCellClasses} text-ink`}>
                    {formatInTz(holiday.date, dateDisplayOptions)}
                  </td>
                  <td className={tableCellClasses}>{holiday.notes}</td>
                  <td className={tableCellClasses}>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="tertiary">
                        <Link href={`/admin/feriados?feriado=${holiday.id}`}>
                          Editar
                        </Link>
                      </Button>
                      <form action={deleteHoliday}>
                        <input type="hidden" name="id" value={holiday.id} />
                        <ConfirmButton />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminPanel>
      )}
    </div>
  );
}
