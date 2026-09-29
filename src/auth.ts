import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { recordLoginAttempt } from "@/lib/security";
import { loginSchema } from "@/lib/validation";

class InactiveAccount extends CredentialsSignin {
  code = "inactive";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { login: {}, password: {} },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const login = parsed.data.login;
        const user = await db.user.findUnique({ where: { login } });
        if (!user) {
          await recordLoginAttempt({ login, userId: null, success: false, headers: request?.headers });
          return null;
        }
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        // Неверный пароль только записывается: ни блокировок, ни задержек, ни лимитов. При 5 подряд админ получает уведомление.
        await recordLoginAttempt({ login, userId: user.id, success: ok, headers: request?.headers });
        if (!ok) return null;
        if (!user.isActive) throw new InactiveAccount();
        return { id: user.id, name: user.fullName, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid) {
        session.user.id = token.uid as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
