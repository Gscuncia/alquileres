import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { getAllPropertiesForAdmin } from "@/lib/properties-db";
import { formatInTz, toDateStr, toUtc } from "@/lib/datetime";
import { formatMoney } from "@/lib/metrics";
import {
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/app/admin/expenses/actions";
import { ExpenseForm } from "@/components/admin/ExpenseForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_TYPE = new Set(["MANTENIMIENTO", "CONSORCIO"]);

interface GastosPageProps {
  searchParams?: {
    gasto?: string;
    from?: string;
    to?: string;
    tipo?: string;
    propiedad?: string;
  };
}

const tableCellClasses = "border-b border-hairline px-4 py-3 text-body-sm text-body";

const inputClasses =
  "w-full rounded-sm border border-hairline bg-canvas px-3 py-2 text-body-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink";

const labelClasses = "block text-caption-sm font-medium text-ink mb-1";

const dateDisplayOptions: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

const typeLabels = {
  MANTENIMIENTO: "Mantenimiento",
  CONSORCIO: "Consorcio",
} as const;

export default async function GastosPage({ searchParams }: GastosPageProps) {
  await requireAdmin();

  const gastoId = searchParams?.gasto?.trim() ?? "";
  const from = VALID_DATE.test(searchParams?.from ?? "")
    ? (searchParams?.from as string)
    : "";
  const to = VALID_DATE.test(searchParams?.to ?? "")
    ? (searchParams?.to as string)
    : "";
  const tipo = VALID_TYPE.has(searchParams?.tipo ?? "")
    ? (searchParams?.tipo as "MANTENIMIENTO" | "CONSORCIO")
    : "";
  const propiedad = searchParams?.propiedad?.trim() ?? "";

  const where: {
    propertyId?: string;
    type?: "MANTENIMIENTO" | "CONSORCIO";
    date?: { gte?: Date; lt?: Date };
  } = {};

  if (propiedad) {
    where.propertyId = propiedad;
  }
  if (tipo) {
    where.type = tipo;
  }
  // Period filter [from, to): same half-open convention as the dashboard.
  if (from || to) {
    where.date = {
      ...(from ? { gte: toUtc(from, "00:00") } : {}),
      ...(to ? { lt: toUtc(to, "00:00") } : {}),
    } as { gte?: Date; lt?: Date };
  }

  const hasFilters = Boolean(from || to || tipo || propiedad);

  const [expenses, properties, editingExpense] = await Promise.all([
    prisma.expense.findMany({
      where: hasFilters ? where : undefined,
      include: { property: true },
      orderBy: { date: "desc" },
    }),
    getAllPropertiesForAdmin(),
    gastoId
      ? prisma.expense.findUnique({ where: { id: gastoId } })
      : Promise.resolve(null),
  ]);

  const editing = editingExpense ?? null;

  const editingInitialValues = editing
    ? {
        id: editing.id,
        type: editing.type,
        propertyId: editing.propertyId,
        category: editing.category,
        description: editing.description,
        amount: Number(editing.amount),
        date: toDateStr(editing.date),
      }
    : undefined;

  return (
    <div className="space-y-6">
      <h2 className="text-display-sm font-semibold text-ink">Gastos</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-title-md font-semibold text-ink">
            {editing ? "Editar gasto" : "Nuevo gasto"}
          </h3>
          {editing && (
            <Link
              href="/admin/gastos"
              className="text-button-sm text-muted underline-offset-2 hover:underline"
            >
              Cancelar edición
            </Link>
          )}
        </div>
        <ExpenseForm
          action={editing ? updateExpense : createExpense}
          properties={properties}
          initialValues={editingInitialValues}
          submitLabel={editing ? "Guardar cambios" : "Crear gasto"}
        />
      </div>

      <form
        method="get"
        action="/admin/gastos"
        className="grid grid-cols-1 gap-4 rounded-md border border-hairline bg-canvas p-4 md:grid-cols-5"
      >
        <div>
          <label htmlFor="from" className={labelClasses}>
            Desde
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="to" className={labelClasses}>
            Hasta
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="tipo" className={labelClasses}>
            Tipo
          </label>
          <select
            id="tipo"
            name="tipo"
            defaultValue={tipo}
            className={inputClasses}
          >
            <option value="">Todos</option>
            <option value="MANTENIMIENTO">Mantenimiento</option>
            <option value="CONSORCIO">Consorcio</option>
          </select>
        </div>
        <div>
          <label htmlFor="propiedad" className={labelClasses}>
            Propiedad
          </label>
          <select
            id="propiedad"
            name="propiedad"
            defaultValue={propiedad}
            className={inputClasses}
          >
            <option value="">Todas</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-sm border border-ink bg-canvas px-4 py-2 text-button-sm font-medium text-ink hover:bg-surface-soft"
          >
            Aplicar
          </button>
          <Link
            href="/admin/gastos"
            className="px-2 py-2 text-button-sm text-muted underline-offset-2 hover:underline"
          >
            Limpiar
          </Link>
        </div>
      </form>

      {expenses.length === 0 ? (
        <div className="rounded-md border border-hairline bg-surface-soft p-6 text-body-md text-body">
          {hasFilters
            ? "No hay gastos que coincidan con los filtros."
            : "Todavía no hay gastos cargados."}
        </div>
      ) : (
        <table className="w-full rounded-md border border-hairline bg-canvas">
          <thead>
            <tr className="bg-surface-soft text-left">
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Tipo</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Propiedad</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Categoría</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Importe</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Fecha</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Descripción</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td className={`${tableCellClasses} text-ink`}>
                  {typeLabels[expense.type]}
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
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/gastos?gasto=${expense.id}`}
                      className="text-button-sm text-ink underline-offset-2 hover:underline"
                    >
                      Editar
                    </Link>
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
      )}
    </div>
  );
}
