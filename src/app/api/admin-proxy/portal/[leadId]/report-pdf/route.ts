import { proxyToInternal } from "@/lib/auth/proxy";

export async function GET(
  req: Request,
  { params }: { params: { leadId: string } },
) {
  return proxyToInternal(req, {
    target: `admin/portal/${encodeURIComponent(params.leadId)}/report-pdf`,
  });
}
