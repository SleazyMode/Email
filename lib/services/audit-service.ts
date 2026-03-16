import { EventType } from "@prisma/client";

import { prisma } from "@/lib/db";

type AuditInput = {
  noticeId: string;
  eventType: EventType;
  actorId?: string | null;
  actorLabel: string;
  summary: string;
  metadata?: Record<string, unknown>;
};

export const auditService = {
  async appendEvent(input: AuditInput) {
    return prisma.auditEvent.create({
      data: {
        noticeId: input.noticeId,
        eventType: input.eventType,
        actorId: input.actorId ?? null,
        actorLabel: input.actorLabel,
        summary: input.summary,
        metadata: JSON.stringify(input.metadata ?? {})
      }
    });
  }
};
