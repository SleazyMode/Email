import { prisma } from "@/lib/db";

export const notificationService = {
  async createNotification(input: {
    noticeId: string;
    recipientEmail: string;
    subject: string;
    body: string;
    status?: string;
  }) {
    return prisma.notification.create({
      data: {
        noticeId: input.noticeId,
        recipientEmail: input.recipientEmail,
        subject: input.subject,
        body: input.body,
        status: input.status ?? "generated"
      }
    });
  }
};
