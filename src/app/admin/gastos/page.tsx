import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { getAllPropertiesForAdmin } from "@/lib/properties-db";
import { formatInTz, toDateStr, toUtc } from "@/lib/datetime";
import { formatMoney } from "@/lib/metrics";
import {
  updateExpense,
  deleteExpense,
  createExpenseType,
  updateExpenseType,
  deleteExpenseType,
  deleteReceiptForm,
} from "@/app/admin/expenses/actions";
import { receiptViewUrl } from "@/lib/drive-receipts";
import { ExpenseForm } from "@/components/admin/ExpenseForm";
import { ExpenseTypeForm } from "@/components/admin/ExpenseTypeForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import {
  AdminPanel,
  AdminEmptyState,
  AdminPageHeader,
  AdminField,
  AdminInput,
} from "@/components/admin/primitives";
import { Button } from "@/components/design-system";

const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface GastosPageProps {
  searchParams?: {
    gasto?: string;
    tipo?: string;
    propiedad?: string;
    from?: string;
    to?: string;
    error?: string;
  };
}

const tableCellClasses = "border-b border-hairline px-4 py-3 text-body-sm text-body";

const dateDisplayOptions: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

export default async function GastosPage({ searchParams }: GastosPageProps) {
  await requireAdmin();

  const gastoId = searchParams?.gasto?.trim() ?? "";
  // `tipo` doubles as the expense filter (type id) and the types-manager edit
  // selector; it is validated against the fetched types below.
  const tipoRaw = searchParams?.tipo?.trim() ?? "";
  const propiedad = searchParams?.propiedad?.trim() ?? "";
  const from = VALID_DATE.test(searchParams?.from ?? "")
    ? (searchParams?.from as string)
    : "";
  const to = VALID_DATE.test(searchParams?.to ?? "")
    ? (searchParams?.to as string)
    : "";

  const [expenseTypes, properties, editingExpense] = await Promise.all([
    prisma.expenseType.findMany({ orderBy: { name: "asc" } }),
    getAllPropertiesForAdmin(),
    gastoId
      ? prisma.expense.findUnique({ where: { id: gastoId } })
      : Promise.resolve(null),
  ]);

  // `tipo` must match one of the fetched types; unknown ids are ignored and
  // a match doubles as the types-manager edit selector.
  const editingTypeRow = expenseTypes.find((type) => type.id === tipoRaw) ?? null;
  const tipo = editingTypeRow?.id ?? "";

  const where: {
    propertyId?: string;
    expenseTypeId?: string;
    date?: { gte?: Date; lt?: Date };
  } = {};

  if (propiedad) {
    where.propertyId = propiedad;
  }
  if (tipo) {
    where.expenseTypeId = tipo;
  }
  // Period filter [from, to): same half-open convention as the dashboard.
  if (from || to) {
    where.date = {
      ...(from ? { gte: toUtc(from, "00:00") } : {}),
      ...(to ? { lt: toUtc(to, "00:00") } : {}),
    } as { gte?: Date; lt?: Date };
  }

  const hasFilters = Boolean(from || to || tipo || propiedad);

  const expenses = await prisma.expense.findMany({
    where: hasFilters ? where : undefined,
    include: {
      property: true,
      expenseType: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  const editing = editingExpense ?? null;

  const editingInitialValues = editing
    ? {
        id: editing.id,
        typeId: editing.expenseTypeId,
        propertyId: editing.propertyId,
        category: editing.category,
        description: editing.description,
        amount: Number(editing.amount),
        date: toDateStr(editing.date),
        receipt: editing.receiptFileId
          ? {
              fileId: editing.receiptFileId,
              fileName: editing.receiptFileName ?? "",
            }
          : undefined,
      }
    : undefined;

  const expenseTypeOptions = expenseTypes.map(({ id, name, requiresProperty }) => ({
    id,
    name,
    requiresProperty,
  }));

  const editingTypeValues = editingTypeRow
    ? {
        id: editingTypeRow.id,
        name: editingTypeRow.name,
        requiresProperty: editingTypeRow.requiresProperty,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gastos"
        action={
          <Button asChild variant="tertiary">
            <Link href="/admin/carga-gastos">Cargar gasto</Link>
          </Button>
        }
      />

      {searchParams?.error === "tipo-gastos" && (
        <div
          role="alert"
          className="rounded-sm border border-hairline bg-surface-soft px-4 py-3 text-body-sm text-primary-error-text"
        >
          No se puede eliminar: el tipo de gasto tiene gastos asociados.
        </div>
      )}

      <AdminPanel>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-title-md font-semibold text-ink">
              Tipos de gasto
            </h3>
            {editingTypeRow && (
              <Button asChild variant="tertiary">
                <Link href="/admin/gastos">Cancelar edición</Link>
              </Button>
            )}
          </div>
          <ExpenseTypeForm
            action={editingTypeRow ? updateExpenseType : createExpenseType}
            initialValues={editingTypeValues}
            submitLabel={editingTypeRow ? "Guardar cambios" : "Crear tipo"}
          />
          {expenseTypes.length === 0 ? (
            <p className="text-caption-sm text-muted">
              Todavía no hay tipos de gasto cargados.
            </p>
          ) : (
            <ul className="divide-y divide-hairline rounded-md border border-hairline">
              {expenseTypes.map((type) => (
                <li
                  key={type.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <span className="flex items-center gap-3 text-body-sm text-body">
                    <span className="text-ink">{type.name}</span>
                    {type.requiresProperty && (
                      <span className="rounded-sm bg-surface-soft px-2 py-0.5 text-caption-sm text-muted">
                        Requiere propiedad
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-3">
                    <Button asChild variant="tertiary">
                      <Link href={`/admin/gastos?tipo=${type.id}`}>
                        Editar
                      </Link>
                    </Button>
                    <form action={deleteExpenseType}>
                      <input type="hidden" name="id" value={type.id} />
                      <ConfirmButton />
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AdminPanel>

      {editing && (
        <AdminPanel>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-title-md font-semibold text-ink">
                Editar gasto
              </h3>
              <Button asChild variant="tertiary">
                <Link href="/admin/gastos">Cancelar edición</Link>
              </Button>
            </div>
            <ExpenseForm
              action={updateExpense}
              properties={properties}
              expenseTypes={expenseTypeOptions}
              initialValues={editingInitialValues}
              submitLabel="Guardar cambios"
            />
          </div>
        </AdminPanel>
      )}

      <form
        method="get"
        action="/admin/gastos"
        className="grid grid-cols-1 gap-4 rounded-md border border-hairline bg-canvas p-4 md:grid-cols-5"
      >
        <AdminField label="Desde" htmlFor="from">
          <AdminInput
            id="from"
            name="from"
            type="date"
            defaultValue={from}
          />
        </AdminField>
        <AdminField label="Hasta" htmlFor="to">
          <AdminInput
            id="to"
            name="to"
            type="date"
            defaultValue={to}
          />
        </AdminField>
        <AdminField label="Tipo" htmlFor="tipo">
          <AdminInput
            as="select"
            id="tipo"
            name="tipo"
            defaultValue={tipo}
          >
            <option value="">Todos</option>
            {expenseTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </AdminInput>
        </AdminField>
        <AdminField label="Propiedad" htmlFor="propiedad">
          <AdminInput
            as="select"
            id="propiedad"
            name="propiedad"
            defaultValue={propiedad}
          >
            <option value="">Todas</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.title}
              </option>
            ))}
          </AdminInput>
        </AdminField>
        <div className="flex items-end gap-2">
          <Button type="submit" variant="secondary">
            Aplicar
          </Button>
          <Button asChild variant="tertiary">
            <Link href="/admin/gastos">Limpiar</Link>
          </Button>
        </div>
      </form>

      {expenses.length === 0 ? (
        <AdminEmptyState>
          {hasFilters
            ? "No hay gastos que coincidan con los filtros."
            : "Todavía no hay gastos cargados."}
        </AdminEmptyState>
      ) : (
        <AdminPanel>
          <table className="w-full">
            <thead>
              <tr className="bg-surface-soft text-left">
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Tipo</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Propiedad</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Categoría</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Importe</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Fecha</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Descripción</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Cargado por</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Factura</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className={`${tableCellClasses} text-ink`}>
                    {expense.expenseType.name}
                  </td>
                  <td className={tableCellClasses}>
                    {expense.property?.title ?? "General"}
                  </td>
                  <td className={tableCellClasses}>{expense.category}</td>
                  <td className={tableCellClasses}>
                    {formatMoney(Number(expense.amount))}
                  </td>
                  <td className={tableCellClasses}>
                    {formatInTz(expense.date, dateDisplayOptions)}
                  </td>
                  <td className={tableCellClasses}>{expense.description}</td>
                  <td className={tableCellClasses}>
                    {expense.createdBy?.name ?? expense.createdByUserId ?? "—"}
                  </td>
                  <td className={tableCellClasses}>
                    {expense.receiptFileId ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={receiptViewUrl(expense.receiptFileId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          Ver
                        </a>
                        <form
                          action={deleteReceiptForm}
                          title="Eliminar factura"
                          className="flex items-center gap-2"
                        >
                          <input type="hidden" name="id" value={expense.id} />
                          <input
                            type="hidden"
                            name="receiptFileId"
                            value={expense.receiptFileId}
                          />
                          <ConfirmButton
                            label="Eliminar"
                            confirmQuestion="¿Eliminar factura?"
                          />
                        </form>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={tableCellClasses}>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="tertiary">
                        <Link href={`/admin/gastos?gasto=${expense.id}`}>
                          Editar
                        </Link>
                      </Button>
                      <form action={deleteExpense}>
                        <input type="hidden" name="id" value={expense.id} />
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
