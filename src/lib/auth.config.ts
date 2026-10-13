import type { NextAuthConfig } from "next-auth";

export default {
  providers: [],
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id;
        token.roleId = user.roleId;
        token.roleName = user.roleName;
        token.role = user.roleName;
        token.allowedTabs = user.allowedTabs;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token?.sub) {
        session.user.id = token.sub;
      }
      if (token?.roleId) {
        session.user.roleId = token.roleId as string;
        session.user.roleName = (token.roleName ?? token.role) as string;
        session.user.role = session.user.roleName;
        session.user.allowedTabs = (token.allowedTabs ?? []) as string[];
        session.user.mustChangePassword = (token.mustChangePassword ?? false) as boolean;
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
