// Re-export compatibility module. New code should import from `@/lib/require-auth`.
export {
  isAdmin,
  hasTab,
  requireAdmin,
  requireAdminForAction,
  requirePermission,
} from "@/lib/require-auth";
