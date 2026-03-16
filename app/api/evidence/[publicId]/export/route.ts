import { NextResponse } from "next/server";

import { requireMunicipalUser } from "@/lib/auth/session";
import { evidenceService } from "@/lib/services/evidence-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ publicId: string }> }
) {
  await requireMunicipalUser();
  const { publicId } = await context.params;
  const payload = await evidenceService.buildEvidenceSummary(publicId);

  return new NextResponse(evidenceService.exportEvidenceJson(payload), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${publicId}-evidence.json"`
    }
  });
}
