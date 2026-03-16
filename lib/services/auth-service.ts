import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";

import { createPasswordHash, randomCode, randomToken, verifyPassword } from "@/lib/crypto/hashing";
import { prisma } from "@/lib/db";
import { addHours, getSessionCookieName } from "@/lib/utils";

export const authService = {
  createPasswordHash,

  async loginMunicipalUser(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || user.role === UserRole.RECIPIENT || !user.passwordHash) {
      return null;
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return null;
    }

    return this.createSession(user.id);
  },

  async createRecipientCode(email: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || user.role !== UserRole.RECIPIENT) {
      return null;
    }

    const code = randomCode();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        oneTimeCode: code,
        codeExpiresAt: addHours(new Date(), 1)
      }
    });

    return { code, user };
  },

  async loginRecipient(email: string, code: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (
      !user ||
      user.role !== UserRole.RECIPIENT ||
      !user.oneTimeCode ||
      !user.codeExpiresAt ||
      user.codeExpiresAt < new Date() ||
      user.oneTimeCode !== code
    ) {
      return null;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        oneTimeCode: null,
        codeExpiresAt: null
      }
    });

    return this.createSession(user.id);
  },

  async createSession(userId: string) {
    const token = randomToken(32);

    await prisma.session.create({
      data: {
        userId,
        token,
        expiresAt: addHours(new Date(), 12)
      }
    });

    const cookieStore = await cookies();
    cookieStore.set(getSessionCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      expires: addHours(new Date(), 12)
    });

    return token;
  },

  async logout() {
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;

    if (token) {
      await prisma.session.deleteMany({
        where: { token }
      });
    }

    cookieStore.delete(getSessionCookieName());
  }
};
