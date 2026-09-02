import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const cleanUsername = credentials.username.trim();
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: { equals: cleanUsername, mode: "insensitive" } },
              { institution: { code: { equals: cleanUsername, mode: "insensitive" } } }
            ]
          },
          include: {
            institution: true
          }
        });

        if (!user) {
          return null;
        }

        let isPasswordValid = false;
        try {
          isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        } catch (e) {}

        // Fallback for plain-text password or default 123/123456
        if (!isPasswordValid) {
          if (
            user.password === credentials.password ||
            ((credentials.password === "123" || credentials.password === "123456") &&
              (user.password === "123" || user.password === "123456" || user.institution?.password === "123" || user.institution?.password === "123456"))
          ) {
            isPasswordValid = true;
            // Upgrade to bcrypt hash
            const newHash = await bcrypt.hash(credentials.password, 10);
            await prisma.user.update({
              where: { id: user.id },
              data: { password: newHash }
            }).catch(() => {});
          }
        }

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          role: user.role,
          eventId: user.eventId,
          zoneId: user.zoneId,
          institutionId: user.institutionId,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
        token.eventId = (user as any).eventId;
        token.zoneId = (user as any).zoneId;
        token.institutionId = (user as any).institutionId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
        session.user.eventId = token.eventId as string | null;
        (session.user as any).zoneId = token.zoneId as string | null;
        (session.user as any).institutionId = token.institutionId as string | null;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login", // We will create this page later
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_dev_only",
};
