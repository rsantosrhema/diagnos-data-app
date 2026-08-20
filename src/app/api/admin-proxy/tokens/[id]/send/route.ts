import { NextResponse } from "next/server";
import { proxyToInternal } from "@/lib/auth/proxy";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return proxyToInternal(req, { target: `admin/tokens/${params.id}/send` });
}
