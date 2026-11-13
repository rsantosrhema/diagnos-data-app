"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  DiagnosticPortal,
  PortalErrorState,
  type DiagnosticPortalData,
} from "@/components/portal/DiagnosticPortal";
import { getPublicPortal, type PublicPortalResponse } from "@/lib/api/client";
import type { MarketAnalysis, InsightsBrief } from "@/lib/agents/types";

function toPortalData(data: PublicPortalResponse): DiagnosticPortalData {
  return {
    ...data,
    analysis: data.analysis as MarketAnalysis | undefined,
    insights: data.insights as InsightsBrief | undefined,
  };
}

export default function PublicPortalPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  const [data, setData] = useState<PublicPortalResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const result = await getPublicPortal(token);
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="flex min-h-screen flex-col bg-rhema-offwhite">
      <DiagnosticPortal
        mode="public"
        data={data ? toPortalData(data) : null}
        loading={loading}
        empty={
          <PortalErrorState
            title="Link inválido ou expirado"
            description="Este link de diagnóstico não está mais disponível. Solicite um novo link ao consultor responsável."
            action={
              <Link href="/" className="btn-primary">
                Voltar ao início
              </Link>
            }
          />
        }
      />
    </main>
  );
}
