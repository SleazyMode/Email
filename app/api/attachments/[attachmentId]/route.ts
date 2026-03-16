import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import { EventType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { auditService } from "@/lib/services/audit-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ attachmentId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { attachmentId } = await context.params;
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { notice: true }
  });

  if (!attachment) {
    return new NextResponse("Not found", { status: 404 });
  }

  const isMunicipal = session.user.role !== UserRole.RECIPIENT;
  const isRecipientOwner = attachment.notice.recipientId === session.user.id;
  if (!isMunicipal && !isRecipientOwner) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  await auditService.appendEvent({
    noticeId: attachment.noticeId,
    eventType: EventType.ATTACHMENT_DOWNLOADED,
    actorId: session.user.id,
    actorLabel: session.user.name,
    summary: `Attachment downloaded: ${attachment.originalName}.`
  });

  const bytes = await readFile(attachment.storagePath);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${basename(attachment.originalName)}"`
    }
  });
}
