import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

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
        token.role = user.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token?.sub) {
        session.user.id = token.sub;
      }
      const role = token.role as Role | undefined;
      if (role) {
        session.user.role = role;
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
