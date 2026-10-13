import Image from "next/image";
import Link from "next/link";
import { requirePermission } from "@/lib/require-auth";
import { SignOutButton } from "@/components/auth/signout-button";
import { AdminNavTabs } from "@/components/admin/AdminNavTabs";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requirePermission();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="relative sticky top-0 z-10 overflow-hidden border-b border-cream-line bg-header-bg px-4 py-4 shadow-sm md:px-6">
        <div className="relative mx-auto flex max-w-[1128px] items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/" className="flex shrink-0 items-center">
              <Image
                src="/logo.svg"
                alt="Alquileres Anita"
                width={120}
                height={60}
                className="h-10 w-auto md:h-12"
                priority
              />
            </Link>
            <div>
              <h1 className="text-title-md font-semibold text-ink">Admin</h1>
              <p className="text-caption-sm text-muted">
                {session.user.email} · {session.user.roleName}
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
        {/* Decorative seaside motif — matches public site header canvas treatment */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08]"
          aria-hidden="true"
        >
          <svg
            className="absolute -right-8 -top-10 h-48 w-48 text-primary md:h-64 md:w-64"
            viewBox="0 0 120 120"
            fill="currentColor"
          >
            <circle cx="60" cy="60" r="50" />
            <circle cx="60" cy="60" r="38" fill="#fff9ed" />
            <circle cx="60" cy="60" r="26" />
            <circle cx="60" cy="60" r="14" fill="#fff9ed" />
            <circle cx="60" cy="60" r="6" />
            <path d="M60 0 Q65 8 60 16 Q55 8 60 0" className="text-sky" fill="currentColor" />
            <path d="M60 104 Q65 112 60 120 Q55 112 60 104" className="text-sky" fill="currentColor" />
            <path d="M0 60 Q8 65 16 60 Q8 55 0 60" className="text-sky" fill="currentColor" />
            <path d="M104 60 Q112 65 120 60 Q112 55 104 60" className="text-sky" fill="currentColor" />
          </svg>
          <svg
            className="absolute bottom-0 left-0 h-24 w-full text-sky"
            preserveAspectRatio="none"
            viewBox="0 0 1440 96"
            fill="currentColor"
          >
            <path d="M0 64 C240 96 480 32 720 64 C960 96 1200 32 1440 64 V96 H0 Z" />
            <path
              d="M0 80 C360 48 720 112 1080 80 C1260 64 1350 72 1440 80 V96 H0 Z"
              className="text-primary opacity-50"
              fill="currentColor"
            />
          </svg>
        </div>
      </header>
      <nav className="border-b border-hairline bg-canvas">
        <div className="mx-auto max-w-[1128px] px-4 py-3 md:px-6">
          <AdminNavTabs
            allowedTabs={session.user.allowedTabs}
            isDefaultAdmin={session.user.isDefaultAdmin}
          />
        </div>
      </nav>
      <main className="mx-auto max-w-[1128px] px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}
