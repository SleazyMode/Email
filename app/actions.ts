"use server";

import { NoticeCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireMunicipalUser, requireRecipient } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { authService } from "@/lib/services/auth-service";
import { noticeService } from "@/lib/services/notice-service";
import { notificationService } from "@/lib/services/notification-service";

export async function loginMunicipalAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const token = await authService.loginMunicipalUser(email, password);
  if (!token) {
    redirect("/login?error=invalid");
  }

  redirect("/admin");
}

export async function requestRecipientCodeAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const result = await authService.createRecipientCode(email);

  if (!result) {
    redirect("/recipient-login?error=unknown");
  }

  const latestNotice = await prisma.notice.findFirst({
    where: {
      recipientId: result.user.id
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (latestNotice) {
    await notificationService.createNotification({
      noticeId: latestNotice.id,
      recipientEmail: email,
      subject: "Recipient access code",
      body: `Demo access code for ${email}: ${result.code}`,
      status: "generated"
    });
  }

  redirect(`/recipient-login?email=${encodeURIComponent(email)}&code=${result.code}`);
}

export async function loginRecipientAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const code = String(formData.get("code") ?? "");
  const token = await authService.loginRecipient(email, code);

  if (!token) {
    redirect(`/recipient-login?email=${encodeURIComponent(email)}&error=invalid`);
  }

  redirect("/recipient");
}

export async function logoutAction() {
  await authService.logout();
  redirect("/");
}

export async function createNoticeAction(formData: FormData) {
  const user = await requireMunicipalUser();
  const recipientId = String(formData.get("recipientId") ?? "");
  const subject = String(formData.get("subject") ?? "");
  const body = String(formData.get("body") ?? "");
  const noticeCategory = String(formData.get("noticeCategory") ?? "GENERAL") as NoticeCategory;
  const attachments = formData.getAll("attachments").filter((value) => value instanceof File) as File[];

  const notice = await noticeService.createNotice({
    senderId: user.id,
    recipientId,
    subject,
    body,
    noticeCategory,
    attachments
  });

  revalidatePath("/admin");
  redirect(`/admin/notices/${notice.publicId}`);
}

export async function sendNoticeAction(formData: FormData) {
  const user = await requireMunicipalUser();
  const publicId = String(formData.get("publicId") ?? "");
  await noticeService.sendNotice(publicId, user.id, user.name);
  revalidatePath("/admin");
  revalidatePath(`/admin/notices/${publicId}`);
  redirect(`/admin/notices/${publicId}`);
}

export async function acknowledgeNoticeAction(formData: FormData) {
  const user = await requireRecipient();
  const publicId = String(formData.get("publicId") ?? "");
  await noticeService.acknowledge(publicId, user.id, user.name);
  revalidatePath("/recipient");
  revalidatePath(`/recipient/notices/${publicId}`);
  revalidatePath("/admin");
  revalidatePath(`/admin/notices/${publicId}`);
  revalidatePath(`/admin/evidence/${publicId}`);
  redirect(`/recipient/notices/${publicId}`);
}

export async function verifyEvidenceAction(formData: FormData) {
  await requireMunicipalUser();
  const publicId = String(formData.get("publicId") ?? "");
  const anchor = String(formData.get("anchor") ?? "");
  const params = new URLSearchParams();
  params.set("integrity", "1");

  if (anchor === "1") {
    params.set("anchor", "1");
  }

  redirect(`/admin/evidence/${publicId}?${params.toString()}`);
}

export async function verifyAnchorAction(formData: FormData) {
  await requireMunicipalUser();
  const publicId = String(formData.get("publicId") ?? "");
  const integrity = String(formData.get("integrity") ?? "");
  const params = new URLSearchParams();
  params.set("anchor", "1");

  if (integrity === "1") {
    params.set("integrity", "1");
  }

  redirect(`/admin/evidence/${publicId}?${params.toString()}`);
}
