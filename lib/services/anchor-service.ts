import { EventType, NoticeStatus } from "@prisma/client";

import { createMerkleProof, verifyMerkleProof, type MerkleProofStep, buildMerkleTree } from "@/lib/crypto/merkle";
import { randomToken, sha256 } from "@/lib/crypto/hashing";
import { prisma } from "@/lib/db";
import { auditService } from "@/lib/services/audit-service";

export type AnchorVerificationResult = {
  passed: boolean;
  anchorVerified: boolean;
  integrityVerified: boolean;
  reason: string;
};

export interface AnchorService {
  anchorNoticeBatch(noticeIds: string[], actorId: string, actorLabel: string): Promise<string | null>;
  verifyNoticeAnchor(noticeId: string): Promise<AnchorVerificationResult>;
}

export class MockBlockchainLedger implements AnchorService {
  async anchorNoticeBatch(noticeIds: string[], actorId: string, actorLabel: string) {
    const notices = await prisma.notice.findMany({
      where: {
        id: { in: noticeIds }
      },
      include: {
        anchorMemberships: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    const anchorable = notices.filter((notice) => notice.anchorMemberships.length === 0);
    if (anchorable.length === 0) {
      return null;
    }

    const leaves = anchorable.map((notice) => notice.noticeHash);
    const { root } = buildMerkleTree(leaves);
    const previous = await prisma.anchorReceipt.findFirst({
      orderBy: {
        anchoredAt: "desc"
      }
    });

    const anchorId = `ANCHOR-${new Date().getFullYear()}-${randomToken(4).toUpperCase()}`;
    const ledgerProof = {
      algorithm: "sha256-merkle-v1",
      receiptHash: sha256(`${previous?.batchRoot ?? "GENESIS"}:${root}:${anchorId}`),
      leafCount: anchorable.length
    };

    const receipt = await prisma.anchorReceipt.create({
      data: {
        anchorId,
        batchRoot: root,
        previousAnchorId: previous?.anchorId ?? null,
        ledgerProof: JSON.stringify(ledgerProof),
        status: "confirmed",
        anchoredAt: new Date()
      }
    });

    for (const notice of anchorable) {
      const proofPath = createMerkleProof(leaves, notice.noticeHash);

      await prisma.noticeAnchorMembership.create({
        data: {
          noticeId: notice.id,
          anchorReceiptId: receipt.id,
          leafHash: notice.noticeHash,
          proofPath: JSON.stringify(proofPath)
        }
      });

      await prisma.notice.update({
        where: { id: notice.id },
        data: {
          status: NoticeStatus.ANCHORED,
          anchorStatus: "anchored",
          anchorReceiptId: receipt.anchorId,
          anchorHash: root,
          anchorTimestamp: receipt.anchoredAt
        }
      });

      await auditService.appendEvent({
        noticeId: notice.id,
        eventType: EventType.BLOCKCHAIN_ANCHOR_SUBMITTED,
        actorId,
        actorLabel,
        summary: `Anchor submitted to local evidence ledger (${anchorId}).`,
        metadata: {
          anchorId,
          batchRoot: root
        }
      });

      await auditService.appendEvent({
        noticeId: notice.id,
        eventType: EventType.BLOCKCHAIN_ANCHOR_CONFIRMED,
        actorId,
        actorLabel,
        summary: `Anchor confirmed in tamper-evident ledger (${anchorId}).`,
        metadata: {
          anchorId,
          batchRoot: root
        }
      });
    }

    return anchorId;
  }

  async verifyNoticeAnchor(noticeId: string) {
    const membership = await prisma.noticeAnchorMembership.findFirst({
      where: { noticeId },
      include: {
        anchorReceipt: true,
        notice: true
      }
    });

    if (!membership) {
      return {
        passed: false,
        integrityVerified: false,
        anchorVerified: false,
        reason: "No anchor receipt exists for this notice."
      };
    }

    const proof = JSON.parse(membership.proofPath) as MerkleProofStep[];
    const anchorVerified = verifyMerkleProof(
      membership.leafHash,
      proof,
      membership.anchorReceipt.batchRoot
    );

    return {
      passed: anchorVerified,
      integrityVerified: anchorVerified,
      anchorVerified,
      reason: anchorVerified
        ? "Notice hash is included in the anchored ledger record."
        : "Merkle proof verification failed."
    };
  }
}

export const anchorService = new MockBlockchainLedger();
