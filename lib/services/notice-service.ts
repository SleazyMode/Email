import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { EventType, NoticeCategory, NoticeStatus, UserRole } from "@prisma/client";

import { sha256 } from "@/lib/crypto/hashing";
import { prisma } from "@/lib/db";
import { auditService } from "@/lib/services/audit-service";
import { anchorService } from "@/lib/services/anchor-service";
import { evidenceService } from "@/lib/services/evidence-service";
import { notificationService } from "@/lib/services/notification-service";
import { getAppUrl } from "@/lib/utils";

function createPublicNoticeId() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NTC-${stamp}-${random}`;
}

async function storeAttachment(noticePublicId: string, file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const folder = path.join(process.cwd(), "storage", "attachments", noticePublicId);
  await mkdir(folder, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = path.join(folder, safeName);
  await writeFile(storagePath, bytes);

  return {
    originalName: file.name,
    storagePath,
    mimeType: file.type || "application/octet-stream",
    byteSize: bytes.byteLength,
    sha256: sha256(bytes)
  };
}

export const noticeService = {
  async getDashboardData() {
    const notices = await prisma.notice.findMany({
      include: {
        createdBy: true,
        recipient: true,
        attachments: true,
        events: {
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const totals = {
      all: notices.length,
      draft: notices.filter((notice) => notice.status === NoticeStatus.DRAFT).length,
      sent: notices.filter((notice) => notice.status === NoticeStatus.SENT).length,
      notified: notices.filter((notice) => notice.status === NoticeStatus.NOTIFIED).length,
      viewed: notices.filter((notice) => notice.status === NoticeStatus.VIEWED).length,
      acknowledged: notices.filter((notice) => notice.status === NoticeStatus.ACKNOWLEDGED).length,
      anchored: notices.filter((notice) => notice.status === NoticeStatus.ANCHORED).length
    };

    return { notices, totals };
  },

  async listRecipients() {
    return prisma.user.findMany({
      where: {
        role: UserRole.RECIPIENT
      },
      orderBy: {
        name: "asc"
      }
    });
  },

  async createNotice(input: {
    senderId: string;
    recipientId: string;
    subject: string;
    body: string;
    noticeCategory: NoticeCategory;
    attachments: File[];
  }) {
    const publicId = createPublicNoticeId();

    const notice = await prisma.notice.create({
      data: {
        publicId,
        senderId: input.senderId,
        recipientId: input.recipientId,
        subject: input.subject,
        body: input.body,
        noticeCategory: input.noticeCategory,
        bodyHash: "",
        noticeHash: ""
      }
    });

    for (const file of input.attachments) {
      if (!file.name || file.size === 0) {
        continue;
      }

      const stored = await storeAttachment(publicId, file);
      await prisma.attachment.create({
        data: {
          noticeId: notice.id,
          ...stored
        }
      });
    }

    await evidenceService.refreshEvidence(notice.id);
    await auditService.appendEvent({
      noticeId: notice.id,
      eventType: EventType.NOTICE_CREATED,
      actorId: input.senderId,
      actorLabel: "Municipal staff",
      summary: "Notice drafted and evidence snapshot created."
    });

    await auditService.appendEvent({
      noticeId: notice.id,
      eventType: EventType.EVIDENCE_COMPILED,
      actorId: input.senderId,
      actorLabel: "Evidence engine",
      summary: "Body hash, attachment hashes, and notice hash compiled."
    });

    return prisma.notice.findUniqueOrThrow({
      where: { id: notice.id }
    });
  },

  async sendNotice(publicId: string, actorId: string, actorLabel: string) {
    const notice = await prisma.notice.findUniqueOrThrow({
      where: { publicId },
      include: {
        recipient: true
      }
    });

    const now = new Date();
    await prisma.notice.update({
      where: { id: notice.id },
      data: {
        status: NoticeStatus.NOTIFIED,
        sentAt: now,
        notifiedAt: now
      }
    });

    await auditService.appendEvent({
      noticeId: notice.id,
      eventType: EventType.NOTICE_SENT,
      actorId,
      actorLabel,
      summary: "Notice marked as sent to the intended recipient."
    });

    await notificationService.createNotification({
      noticeId: notice.id,
      recipientEmail: notice.recipient.email,
      subject: `Official notice available: ${notice.subject}`,
      body: [
        `A new official notice is available in the municipal recipient portal.`,
        `Notice ID: ${notice.publicId}`,
        `Access portal: ${getAppUrl()}/recipient-login`,
        `This message is a notification only. The notice content is not transmitted by email.`
      ].join("\n")
    });

    await auditService.appendEvent({
      noticeId: notice.id,
      eventType: EventType.RECIPIENT_NOTIFIED,
      actorId,
      actorLabel,
      summary: `Recipient notification generated for ${notice.recipient.email}.`
    });

    await anchorService.anchorNoticeBatch([notice.id], actorId, actorLabel);
  },

  async markPortalAccess(noticeId: string, actorId: string, actorLabel: string) {
    await auditService.appendEvent({
      noticeId,
      eventType: EventType.PORTAL_ACCESSED,
      actorId,
      actorLabel,
      summary: "Recipient portal session accessed."
    });
  },

  async markViewed(publicId: string, actorId: string, actorLabel: string) {
    const notice = await prisma.notice.findUniqueOrThrow({
      where: { publicId }
    });

    if (!notice.viewedAt) {
      const viewedAt = new Date();
      await prisma.notice.update({
        where: { id: notice.id },
        data: {
          status: NoticeStatus.VIEWED,
          viewedAt
        }
      });

      await auditService.appendEvent({
        noticeId: notice.id,
        eventType: EventType.NOTICE_VIEWED,
        actorId,
        actorLabel,
        summary: "Recipient opened the notice detail page."
      });
    }
  },

  async acknowledge(publicId: string, actorId: string, actorLabel: string) {
    const notice = await prisma.notice.findUniqueOrThrow({
      where: { publicId }
    });

    if (!notice.acknowledgedAt) {
      const acknowledgedAt = new Date();
      await prisma.notice.update({
        where: { id: notice.id },
        data: {
          status: NoticeStatus.ACKNOWLEDGED,
          acknowledgedAt
        }
      });

      await auditService.appendEvent({
        noticeId: notice.id,
        eventType: EventType.NOTICE_ACKNOWLEDGED,
        actorId,
        actorLabel,
        summary: "Recipient acknowledged receipt in the portal."
      });
    }
  },

  async getNoticeDetail(publicId: string) {
    return prisma.notice.findUniqueOrThrow({
      where: { publicId },
      include: {
        createdBy: true,
        recipient: true,
        attachments: true,
        events: {
          orderBy: {
            createdAt: "asc"
          }
        },
        notifications: {
          orderBy: {
            createdAt: "desc"
          }
        },
        anchorMemberships: {
          include: {
            anchorReceipt: true
          }
        }
      }
    });
  },

  async listRecipientNotices(recipientId: string) {
    return prisma.notice.findMany({
      where: {
        recipientId
      },
      include: {
        attachments: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }
};
