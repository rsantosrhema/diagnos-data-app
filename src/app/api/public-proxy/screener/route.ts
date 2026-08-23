import { NextResponse } from "next/server";
import { proxyToInternal } from "@/lib/auth/proxy";

export async function POST(req: Request) {
  return proxyToInternal(req, { target: "screener" });
}
