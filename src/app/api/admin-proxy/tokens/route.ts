import { NextResponse } from "next/server";
import { proxyToInternal } from "@/lib/auth/proxy";

export async function GET(req: Request) {
  return proxyToInternal(req, { target: "admin/tokens" });
}
