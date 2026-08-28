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

const h = React.createElement;

function ScreenerReport({ input }: { input: GeneratePdfInput }) {
  const dimensionRows = input.dimensionScores.map((d, i) =>
    h(View, { key: d.name, style: [styles.tableRow, ...(i % 2 === 1 ? [styles.tableRowAlt] : [])] },
      h(Text, { style: styles.colName }, d.name),
      h(Text, { style: styles.colNivel }, String(d.nivel)),
      h(Text, { style: styles.colPeso }, String(d.peso)),
      h(Text, { style: styles.colScore }, (d.nivel * d.peso).toFixed(0)),
    ),
  );

  const children = [
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
