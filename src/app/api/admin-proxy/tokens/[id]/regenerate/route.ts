import { proxyToInternal } from "@/lib/auth/proxy";

interface Params {
  params: { id: string };
}

export async function POST(req: Request, { params }: Params) {
  return proxyToInternal(req, { target: `admin/tokens/${params.id}/regenerate` });
}
