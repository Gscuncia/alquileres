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
    signIn: async () => true,
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id;
        token.roleId = user.roleId;
        token.roleName = user.roleName;
        token.allowedTabs = user.allowedTabs;
        token.isDefaultAdmin = user.isDefaultAdmin;
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
        session.user.roleName = token.roleName as string;
        session.user.allowedTabs = (token.allowedTabs ?? []) as string[];
        session.user.isDefaultAdmin = token.isDefaultAdmin === true;
        session.user.mustChangePassword = (token.mustChangePassword ?? false) as boolean;
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
