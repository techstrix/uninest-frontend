import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "uninest-admin-dev-secret",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = String(credentials?.identifier ?? "").trim()
        const password = String(credentials?.password ?? "")

        if (!identifier || !password) return null

        const admin = await prisma.admin.findFirst({
          where: {
            OR: [{ email: identifier }, { username: identifier }],
            isActive: true,
          },
        })

        if (!admin) return null

        const isValid = await bcrypt.compare(password, admin.passwordHash)
        if (!isValid) return null

        await prisma.admin.update({
          where: { id: admin.id },
          data: { lastLogin: new Date() },
        })

        return {
          id: admin.id,
          name: admin.username,
          email: admin.email,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.adminId = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.adminId ?? token.sub ?? "")
      }
      return session
    },
  },
})
