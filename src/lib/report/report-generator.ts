import React from "react";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { GeneratePdfInput } from "@/lib/service/screen-service";

const COLORS = {
  primary: "#4A2C7D",
  institutional: "#3B2366",
  lavender: "#D9D5E0",
  offwhite: "#F8F7FC",
  dark: "#333333",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.dark,
  },
  header: {
    backgroundColor: COLORS.institutional,
    padding: 24,
    marginBottom: 24,
    borderRadius: 4,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    color: COLORS.lavender,
    fontSize: 10,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.institutional,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lavender,
    paddingBottom: 4,
  },
  bandBox: {
    backgroundColor: COLORS.offwhite,
    borderWidth: 1,
    borderColor: COLORS.lavender,
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  bandLabel: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginBottom: 4,
  },
  bandDescription: {
    fontSize: 10,
    color: COLORS.dark,
    textAlign: "center",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.institutional,
    padding: 8,
    borderRadius: 2,
  },
  tableHeaderText: {
    color: COLORS.white,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lavender,
  },
  tableRowAlt: {
    backgroundColor: COLORS.offwhite,
  },
  colName: { flex: 3, fontSize: 9 },
  colNivel: { flex: 1, fontSize: 9, textAlign: "center" },
  colPeso: { flex: 1, fontSize: 9, textAlign: "center" },
  colScore: { flex: 1, fontSize: 9, textAlign: "center" },
  riskBox: {
    backgroundColor: "#FDEBEC",
    borderWidth: 1,
    borderColor: "#9F2F2D",
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  riskText: {
    fontSize: 10,
    color: "#9F2F2D",
    fontFamily: "Helvetica-Bold",
  },
  imbalanceBox: {
    backgroundColor: "#FBF3DB",
    borderWidth: 1,
    borderColor: "#956400",
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  imbalanceText: {
    fontSize: 10,
    color: "#956400",
    fontFamily: "Helvetica-Bold",
  },
  commercialBox: {
    backgroundColor: COLORS.offwhite,
    borderWidth: 1,
    borderColor: COLORS.lavender,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  insightRow: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start",
  },
  insightSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginTop: 2,
    marginRight: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.lavender,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.lavender,
    textAlign: "center",
  },
});

const PRIORITY_COLORS: Record<string, string> = {
  alta: "#C0392B",
  media: "#F1C40F",
  baixa: "#2980B9",
};
const DEFAULT_BULLET_COLOR = PRIORITY_COLORS.baixa;

function bulletColor(prioridade: string): string {
  return PRIORITY_COLORS[prioridade] ?? DEFAULT_BULLET_COLOR;
}

const h = React.createElement;

function bulletText(bullet: { texto: string; prioridade: string }): string {
  return `[${bullet.prioridade.toUpperCase()}] ${bullet.texto}`;
}

export function buildReportChildren(input: GeneratePdfInput): ReturnType<typeof h>[] {
  const dimensionRows = input.dimensionScores.map((d, i) =>
    h(View, { key: d.name, style: [styles.tableRow, ...(i % 2 === 1 ? [styles.tableRowAlt] : [])] },
      h(Text, { style: styles.colName }, d.name),
      h(Text, { style: styles.colNivel }, String(d.nivel)),
      h(Text, { style: styles.colPeso }, String(d.peso)),
      h(Text, { style: styles.colScore }, (d.nivel * d.peso).toFixed(0)),
    ),
  );

  return [
    h(View, { key: "header", style: styles.header },
      h(Text, { style: styles.headerTitle }, "Diagnóstico de Maturidade de Dados"),
      h(Text, { style: styles.headerSubtitle }, "Rhema Data — Relatório de Autoavaliação"),
    ),
    h(View, { key: "respondent", style: styles.section },
      h(Text, { style: styles.sectionTitle }, "Respondente"),
      h(Text, null, `Nome: ${input.respondentName}`),
    ),
    h(View, { key: "band", style: styles.bandBox },
      h(Text, { style: styles.bandLabel }, input.band.rotulo),
      h(Text, { style: styles.bandDescription }, input.band.descricao),
    ),
    h(View, { key: "table", style: styles.section },
      h(Text, { style: styles.sectionTitle }, "Scores por Dimensão"),
      h(View, { style: styles.tableHeader },
        h(Text, { style: [styles.tableHeaderText, styles.colName] }, "Dimensão"),
        h(Text, { style: [styles.tableHeaderText, styles.colNivel] }, "Nível"),
        h(Text, { style: [styles.tableHeaderText, styles.colPeso] }, "Peso"),
        h(Text, { style: [styles.tableHeaderText, styles.colScore] }, "Score"),
      ),
      ...dimensionRows,
    ),
    h(View, { key: "risk", style: styles.riskBox },
      h(Text, { style: styles.riskText },
        `Principal exposição de risco: ${input.riskDimension.name} (nível ${input.riskDimension.nivel})`,
      ),
    ),
    ...(input.imbalance
      ? [h(View, { key: "imbalance", style: styles.imbalanceBox },
          h(Text, { style: styles.imbalanceText },
            "Desequilíbrio detectado: diferença superior a 3 níveis entre a maior e a menor dimensão.",
          ),
        )]
      : []),
    ...(input.commercialAnswer
      ? [h(View, { key: "commercial", style: styles.commercialBox },
          h(Text, { style: styles.sectionTitle }, "Estimativa de Impacto"),
          h(Text, null, input.commercialAnswer),
        )]
      : []),
    ...(input.analysis
      ? [h(View, { key: "analysis", style: styles.section },
          h(Text, { style: styles.sectionTitle }, "Análise de Mercado"),
          h(Text, { style: { fontSize: 9, marginBottom: 6 } }, input.analysis.resumo),
          ...input.analysis.dores.map((pain) =>
            h(View, { key: pain.dimensao_id, style: { marginBottom: 4 } },
              h(Text, { style: { fontSize: 9, fontFamily: "Helvetica-Bold" } },
                `${pain.dimensao}${pain.evidencia_mercado ? " — confirmada pelo mercado" : ""}`,
              ),
              h(Text, { style: { fontSize: 9 } }, pain.dor),
            ),
          ),
        )]
      : []),
    ...(input.insights && input.insights.bullets.length > 0
      ? [h(View, { key: "insights", style: styles.section },
          h(Text, { style: styles.sectionTitle }, "Insights Priorizados"),
          ...input.insights.bullets.map((bullet, i) =>
            h(View, { key: `bullet-${i}`, style: styles.insightRow },
              h(View, {
                style: [styles.insightSquare, { backgroundColor: bulletColor(bullet.prioridade) }],
              }),
              h(Text, { style: styles.insightText }, [
                `[${bullet.prioridade.toUpperCase()}] `,
                bullet.texto,
              ]),
            ),
          ),
        )]
      : []),
    ...(input.analysis && input.analysis.contexto_concorrentes.length > 0
      ? [h(View, { key: "competitors", style: styles.section },
          h(Text, { style: styles.sectionTitle }, "Concorrentes"),
          ...input.analysis.contexto_concorrentes.map((c, i) =>
            h(View, { key: `comp-${i}`, style: { marginBottom: 4 } },
              h(Text, { style: { fontSize: 9, fontFamily: "Helvetica-Bold" } }, c.nome),
              h(Text, { style: { fontSize: 9 } }, c.contexto),
            ),
          ),
        )]
      : []),
    h(View, { key: "warning", style: styles.section },
      h(Text, { style: { fontSize: 8, color: COLORS.lavender, fontStyle: "italic" } },
        "Pesos ajustados com base no perfil da empresa (segmento, porte e faturamento). Instrumento de triagem baseado em autoavaliação. Não substitui diagnóstico com evidência documental. Resultado reportado como faixa, não como número exato.",
      ),
    ),
    h(View, { key: "footer", style: styles.footer },
      h(Text, { style: styles.footerText },
        `© ${new Date().getFullYear()} Rhema Data — Diagnóstico de Maturidade de Dados`,
      ),
    ),
  ];
}

export function ScreenerReport({ input }: { input: GeneratePdfInput }) {
  const children = buildReportChildren(input);
  return h(Document, null,
    h(Page, { size: "A4", style: styles.page }, ...children),
  );
}

export async function generateScreenerPdf(
  input: GeneratePdfInput,
): Promise<{ pdf: Buffer; filename: string }> {
  const element = React.createElement(ScreenerReport, { input });
  const buffer = await renderToBuffer(element as never);

  const filename = `diagnostico-${input.respondentName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}.pdf`;

  return { pdf: buffer, filename };
}
