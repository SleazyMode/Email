import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getSessionCookieName } from "@/lib/utils";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true }
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session;
}

export async function requireUser() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  return session.user;
}

export async function requireMunicipalUser() {
  const user = await requireUser();
  if (user.role === UserRole.RECIPIENT) {
    redirect("/recipient");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireMunicipalUser();
  if (user.role !== UserRole.ADMIN) {
    redirect("/admin");
  }
  return user;
}

export async function requireRecipient() {
  const user = await requireUser();
  if (user.role !== UserRole.RECIPIENT) {
    redirect("/admin");
  }
  return user;
}
