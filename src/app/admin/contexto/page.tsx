import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-auth";
import {
  getAboutContent,
  getWhatToDoContent,
} from "@/lib/site-content";
import { updateAboutContent, updateWhatToDoContent } from "./actions";
import { AboutContentForm } from "@/components/admin/AboutContentForm";
import { WhatToDoContentForm } from "@/components/admin/WhatToDoContentForm";
import { AdminPageHeader, AdminPanel } from "@/components/admin/primitives";

export default async function ContextoPage() {
  await requirePermission("contexto");

  const [aboutContent, whatToDoContent, siteRows] = await Promise.all([
    getAboutContent(),
    getWhatToDoContent(),
    prisma.siteContent.findMany(),
  ]);

  // The forms edit the persisted text: a saved body round-trips exactly as
  // typed, so fall back to the default paragraphs only when there is no row.
  const aboutRow = siteRows.find((row) => row.page === "quienes-somos");
  const whatToDoRow = siteRows.find((row) => row.page === "que-hacer");

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Contexto" />
      <p className="text-body-sm text-body">
        Editá acá el texto y las fotos de las páginas públicas «Quienes somos»
        y «¿Qué hacer en San Clemente del Tuyú?».
      </p>

      <AdminPanel title="Quienes somos">
        <AboutContentForm
          action={updateAboutContent}
          initialValues={{
            intro: aboutRow?.intro ?? aboutContent.intro,
            body: aboutRow?.body ?? aboutContent.paragraphs.join("\n\n"),
            images: aboutContent.images,
          }}
        />
      </AdminPanel>

      <AdminPanel title="¿Qué hacer en San Clemente del Tuyú?">
        <WhatToDoContentForm
          action={updateWhatToDoContent}
          initialValues={{
            intro: whatToDoRow?.intro ?? whatToDoContent.intro,
            cards: whatToDoContent.cards,
          }}
        />
      </AdminPanel>
    </div>
  );
}
