import { NextResponse } from "next/server";
import { proxyToInternal } from "@/lib/auth/proxy";

export async function GET(
  req: Request,
  { params }: { params: { token: string } },
) {
  return proxyToInternal(req, {
    target: `portal/${encodeURIComponent(params.token)}`,
  });
}
