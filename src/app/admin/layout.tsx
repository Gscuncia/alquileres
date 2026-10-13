import { requireAdmin } from "@/lib/require-admin";
import { SignOutButton } from "@/components/auth/signout-button";
import { AdminNavTabs } from "@/components/admin/AdminNavTabs";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-hairline bg-canvas px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-[1128px] items-center justify-between">
          <div>
            <h1 className="text-title-md font-semibold text-ink">Admin</h1>
            <p className="text-caption-sm text-muted">
              {session.user.email} · {session.user.role}
            </p>
          </div>
          <SignOutButton />
        </div>
      </header>
      <nav className="border-b border-hairline bg-canvas">
        <div className="mx-auto max-w-[1128px] px-4 py-3 md:px-6">
          <AdminNavTabs />
        </div>
      </nav>
      <main className="mx-auto max-w-[1128px] px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}
