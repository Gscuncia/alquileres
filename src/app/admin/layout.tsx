import { requireAdmin } from "@/lib/require-admin";
import { SignOutButton } from "@/components/auth/signout-button";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-hairline bg-canvas px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-title-md font-semibold text-ink">Admin</h1>
            <p className="text-caption-sm text-muted">
              {session.user.email} · {session.user.role}
            </p>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
