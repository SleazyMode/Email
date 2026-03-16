import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  EventType,
  NoticeCategory,
  NoticeStatus,
  PrismaClient,
  UserRole
} from "@prisma/client";

import { authService } from "@/lib/services/auth-service";
import { auditService } from "@/lib/services/audit-service";
import { anchorService } from "@/lib/services/anchor-service";
import { evidenceService } from "@/lib/services/evidence-service";
import { notificationService } from "@/lib/services/notification-service";
import { sha256 } from "@/lib/crypto/hashing";

const prisma = new PrismaClient();

async function createAttachment(noticeId: string, publicId: string, name: string, content: string) {
  const folder = path.join(process.cwd(), "storage", "attachments", publicId);
  await mkdir(folder, { recursive: true });
  const storagePath = path.join(folder, name);
  const bytes = Buffer.from(content, "utf8");
  await writeFile(storagePath, bytes);

  return prisma.attachment.create({
    data: {
      noticeId,
      originalName: name,
      storagePath,
      mimeType: "text/plain",
      byteSize: bytes.byteLength,
      sha256: sha256(bytes)
    }
  });
}

async function appendTimeline(
  noticeId: string,
  actorId: string,
  actorLabel: string,
  items: Array<{ eventType: EventType; summary: string }>
) {
  for (const item of items) {
    await auditService.appendEvent({
      noticeId,
      actorId,
      actorLabel,
      eventType: item.eventType,
      summary: item.summary
    });
  }
}

async function main() {
  await prisma.noticeAnchorMembership.deleteMany();
  await prisma.anchorReceipt.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      email: "admin@riverton.gov",
      name: "Jordan Hale",
      role: UserRole.ADMIN,
      department: "Clerk Administration",
      passwordHash: authService.createPasswordHash("Password123!")
    }
  });

  const staff = await prisma.user.create({
    data: {
      email: "staff@riverton.gov",
      name: "Morgan Lee",
      role: UserRole.STAFF,
      department: "Public Works",
      passwordHash: authService.createPasswordHash("Password123!")
    }
  });

  const recipient = await prisma.user.create({
    data: {
      email: "citizen@example.com",
      name: "Taylor Brooks",
      role: UserRole.RECIPIENT
    }
  });

  const noticeOne = await prisma.notice.create({
    data: {
      publicId: "NTC-20260317-DEMO01",
      senderId: staff.id,
      recipientId: recipient.id,
      subject: "Water Utility Billing Adjustment Notice",
      body: [
        "This notice confirms a billing adjustment for utility account RIV-48291.",
        "The municipality has corrected a duplicated meter reading from February 2026.",
        "A revised amount due of $118.40 is now reflected in the resident portal.",
        "Please review the attached adjustment summary."
      ].join("\n\n"),
      noticeCategory: NoticeCategory.UTILITIES,
      status: NoticeStatus.ACKNOWLEDGED,
      bodyHash: "",
      noticeHash: "",
      sentAt: new Date("2026-03-17T08:15:00.000Z"),
      notifiedAt: new Date("2026-03-17T08:15:00.000Z"),
      viewedAt: new Date("2026-03-17T10:20:00.000Z"),
      acknowledgedAt: new Date("2026-03-17T10:24:00.000Z")
    }
  });

  await createAttachment(
    noticeOne.id,
    noticeOne.publicId,
    "billing-adjustment-summary.txt",
    "Adjusted charge: 118.40 USD\nReason: duplicate meter reading corrected\nAccount: RIV-48291"
  );

  await evidenceService.refreshEvidence(noticeOne.id);

  await appendTimeline(noticeOne.id, staff.id, staff.name, [
    { eventType: EventType.NOTICE_CREATED, summary: "Notice record created for the intended recipient." },
    { eventType: EventType.EVIDENCE_COMPILED, summary: "Evidence snapshot created with body hash, attachment hashes, and notice hash." },
    { eventType: EventType.NOTICE_SENT, summary: "Notice sent to the intended recipient." },
    { eventType: EventType.RECIPIENT_NOTIFIED, summary: "Recipient notification generated for citizen@example.com." }
  ]);

  await appendTimeline(noticeOne.id, recipient.id, recipient.name, [
    { eventType: EventType.PORTAL_ACCESSED, summary: "Recipient portal session accessed." },
    { eventType: EventType.NOTICE_VIEWED, summary: "Recipient opened the notice detail page." },
    { eventType: EventType.NOTICE_ACKNOWLEDGED, summary: "Recipient acknowledged receipt in the portal." }
  ]);

  await notificationService.createNotification({
    noticeId: noticeOne.id,
    recipientEmail: recipient.email,
    subject: `Official notice available: ${noticeOne.subject}`,
    body: `A new official notice is available in the municipal recipient portal.\nNotice ID: ${noticeOne.publicId}\nAccess portal: http://localhost:3000/recipient-login`,
    status: "generated"
  });

  await anchorService.anchorNoticeBatch([noticeOne.id], admin.id, admin.name);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
