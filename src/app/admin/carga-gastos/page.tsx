import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { getAllPropertiesForAdmin } from "@/lib/properties-db";
import { createExpense } from "@/app/admin/expenses/actions";
import { ExpenseForm } from "@/components/admin/ExpenseForm";
import {
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin/primitives";

/**
 * Dedicated expense-creation page: only the create form, no filters,
 * no table and no types manager.
 */
export default async function CargaGastosPage() {
  await requireAdmin();

  const [expenseTypes, properties] = await Promise.all([
    prisma.expenseType.findMany({ orderBy: { name: "asc" } }),
    getAllPropertiesForAdmin(),
  ]);

  const expenseTypeOptions = expenseTypes.map(
    ({ id, name, requiresProperty }) => ({
      id,
      name,
      requiresProperty,
    }),
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Carga Gastos" />
      <p className="text-caption-sm text-muted">
        Formulario para cargar un nuevo gasto.
      </p>

      <AdminPanel>
        <div className="space-y-4">
          <h3 className="text-title-md font-semibold text-ink">Nuevo gasto</h3>
          <ExpenseForm
            action={createExpense}
            properties={properties}
            expenseTypes={expenseTypeOptions}
            submitLabel="Crear gasto"
          />
        </div>
      </AdminPanel>
    </div>
  );
}
