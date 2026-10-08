import { NextResponse } from "next/server";
import { proxyToInternal } from "@/lib/auth/proxy";

async function proxy(req: Request, leadId: string): Promise<NextResponse> {
  return proxyToInternal(req, {
    target: `admin/portal/${encodeURIComponent(leadId)}/share`,
  });
}

export async function POST(
  req: Request,
  { params }: { params: { leadId: string } },
) {
  return proxy(req, params.leadId);
}

export async function DELETE(
  req: Request,
  { params }: { params: { leadId: string } },
) {
  return proxy(req, params.leadId);
}
