import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleId: string;
      roleName: string;
      allowedTabs: string[];
      landingTab: string | null;
      isDefaultAdmin: boolean;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    roleId: string;
    roleName: string;
    allowedTabs: string[];
    landingTab: string | null;
    isDefaultAdmin: boolean;
    mustChangePassword: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roleId?: string;
    roleName?: string;
    allowedTabs?: string[];
    landingTab?: string | null;
    isDefaultAdmin?: boolean;
    mustChangePassword?: boolean;
  }
}
