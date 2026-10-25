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
    redirect: async ({ url, baseUrl }) => {
      // Relative callback URLs stay on the host the user is browsing; on
      // Vercel the configured base URL can be the internal production alias,
      // so bailing early keeps redirects in-domain.
      if (url.startsWith("/")) {
        return url;
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id;
        token.roleId = user.roleId;
        token.roleName = user.roleName;
        token.allowedTabs = user.allowedTabs;
        token.landingTab = user.landingTab;
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
        session.user.landingTab = (token.landingTab ?? null) as string | null;
        session.user.isDefaultAdmin = token.isDefaultAdmin === true;
        session.user.mustChangePassword = (token.mustChangePassword ?? false) as boolean;
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
