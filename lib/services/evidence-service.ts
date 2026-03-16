import { Attachment, Notice, Prisma } from "@prisma/client";

import { buildMerkleTree } from "@/lib/crypto/merkle";
import { sha256 } from "@/lib/crypto/hashing";
import { prisma } from "@/lib/db";
import { anchorService } from "@/lib/services/anchor-service";

type NoticeWithAttachments = Notice & {
  attachments: Attachment[];
};

type EvidenceSummary = Awaited<ReturnType<typeof buildEvidenceSummary>>;

type EvidenceVerification = {
  passed: boolean;
  integrityVerified: boolean;
  anchorVerified: boolean;
  reason: string;
  recomputedBodyHash: string;
  recomputedNoticeHash: string;
  recomputedAttachmentMerkleRoot: string | null;
};

function serializeNoticeForHash(notice: Pick<Notice, "publicId" | "subject" | "body" | "senderId" | "recipientId" | "createdAt">, attachments: Attachment[]) {
  return JSON.stringify({
    noticeId: notice.publicId,
    subject: notice.subject,
    body: notice.body,
    senderId: notice.senderId,
    recipientId: notice.recipientId,
    createdAt: notice.createdAt.toISOString(),
    attachments: attachments.map((attachment) => ({
      name: attachment.originalName,
      mimeType: attachment.mimeType,
      byteSize: attachment.byteSize,
      sha256: attachment.sha256
    }))
  });
}

function computeAttachmentMerkleRoot(attachments: Attachment[]) {
    if (attachments.length === 0) {
      return null;
    }

    return buildMerkleTree(attachments.map((attachment) => attachment.sha256)).root;
}

function computeNoticeBodyHash(subject: string, body: string) {
    return sha256(JSON.stringify({ subject, body }));
}

function computeNoticeHash(
  notice: Pick<Notice, "publicId" | "subject" | "body" | "senderId" | "recipientId" | "createdAt">,
  attachments: Attachment[]
) {
    return sha256(serializeNoticeForHash(notice, attachments));
}

async function refreshEvidence(noticeId: string) {
    const notice = await prisma.notice.findUniqueOrThrow({
      where: { id: noticeId },
      include: { attachments: true }
    });

    const bodyHash = computeNoticeBodyHash(notice.subject, notice.body);
    const attachmentMerkleRoot = computeAttachmentMerkleRoot(notice.attachments);
    const noticeHash = computeNoticeHash(notice, notice.attachments);

    return prisma.notice.update({
      where: { id: noticeId },
      data: {
        bodyHash,
        attachmentMerkleRoot,
        noticeHash
      }
    });
}

async function buildEvidenceSummary(publicId: string) {
    const notice = await prisma.notice.findUniqueOrThrow({
      where: { publicId },
      include: {
        createdBy: true,
        recipient: true,
        attachments: true,
        events: {
          orderBy: { createdAt: "asc" }
        },
        notifications: {
          orderBy: { createdAt: "desc" }
        },
        anchorMemberships: {
          include: {
            anchorReceipt: true
          }
        }
      }
    });

    return {
      notice,
      verification: await verifyNoticeIntegrity(notice)
    };
}

async function verifyNoticeIntegrity(noticeInput: NoticeWithAttachments | string): Promise<EvidenceVerification> {
    const notice =
      typeof noticeInput === "string"
        ? await prisma.notice.findUniqueOrThrow({
            where: { id: noticeInput },
            include: { attachments: true }
          })
        : noticeInput;

    const recomputedBodyHash = computeNoticeBodyHash(notice.subject, notice.body);
    const recomputedNoticeHash = computeNoticeHash(notice, notice.attachments);
    const attachmentMerkleRoot = computeAttachmentMerkleRoot(notice.attachments);
    const anchorVerification = await anchorService.verifyNoticeAnchor(notice.id);

    const integrityVerified =
      recomputedBodyHash === notice.bodyHash &&
      recomputedNoticeHash === notice.noticeHash &&
      attachmentMerkleRoot === notice.attachmentMerkleRoot;

    return {
      passed: integrityVerified && (notice.anchorStatus !== "anchored" || anchorVerification.anchorVerified),
      integrityVerified,
      anchorVerified: notice.anchorStatus === "anchored" ? anchorVerification.anchorVerified : false,
      reason: integrityVerified
        ? anchorVerification.reason
        : "Stored evidence hashes do not match recomputed values.",
      recomputedBodyHash,
      recomputedNoticeHash,
      recomputedAttachmentMerkleRoot: attachmentMerkleRoot
    };
}

function exportEvidenceJson(data: EvidenceSummary) {
    return JSON.stringify(data, null, 2);
}

export const evidenceService = {
  computeAttachmentMerkleRoot,
  computeNoticeBodyHash,
  computeNoticeHash,
  refreshEvidence,
  buildEvidenceSummary,
  verifyNoticeIntegrity,
  exportEvidenceJson
};
