import { proxyToInternal } from "@/lib/auth/proxy";

export async function GET(req: Request) {
  return proxyToInternal(req, { target: "admin/session" });
}

export async function POST(req: Request) {
  return proxyToInternal(req, { target: "admin/session" });
}

export async function DELETE(req: Request) {
  return proxyToInternal(req, { target: "admin/session" });
}
