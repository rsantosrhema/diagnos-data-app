/* eslint-disable */
const { renderToBuffer, Document, Page, Text, View, StyleSheet } = require("@react-pdf/renderer");
const React = require("react");

const COLORS = {
  primary: "#4A2C7D",
  institutional: "#3B2366",
  lavender: "#D9D5E0",
  offwhite: "#F8F7FC",
  dark: "#333333",
  white: "#FFFFFF",
};

const PAGE = { margin: 40, footer: 34 };
const BODY_FONT_SIZE = 9.5;
const BODY_LINE_HEIGHT = 1.5;

const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE.margin,
    paddingBottom: PAGE.margin,
    paddingHorizontal: PAGE.margin,
    fontFamily: "Helvetica",
    fontSize: BODY_FONT_SIZE,
    lineHeight: BODY_LINE_HEIGHT,
    color: COLORS.dark,
  },
  header: { backgroundColor: COLORS.institutional, padding: 24, marginBottom: 20, borderRadius: 4 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  headerSubtitle: { color: COLORS.lavender, fontSize: 10 },
  section: { marginBottom: 16 },
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
  },
  bandLabel: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginBottom: 6,
    textAlign: "center",
    lineHeight: 1.2,
  },
  bandDescription: { fontSize: 10, color: COLORS.dark, textAlign: "center", lineHeight: 1.5 },
  radarBox: { alignItems: "center", marginBottom: 16 },
  tableHeader: { flexDirection: "row", backgroundColor: COLORS.institutional, padding: 8, borderRadius: 2 },
  tableHeaderText: { color: COLORS.white, fontSize: 9, fontFamily: "Helvetica-Bold" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lavender,
  },
  tableRowAlt: { backgroundColor: COLORS.offwhite },
  colName: { flex: 3, fontSize: 9 },
  colNivel: { flex: 1, fontSize: 9, textAlign: "center" },
  colPeso: { flex: 1, fontSize: 9, textAlign: "center" },
  colScore: { flex: 1, fontSize: 9, textAlign: "center" },
  riskBox: { backgroundColor: "#FDEBEC", borderWidth: 1, borderColor: "#9F2F2D", borderRadius: 4, padding: 12, marginBottom: 12 },
  riskText: { fontSize: 10, color: "#9F2F2D", fontFamily: "Helvetica-Bold" },
  imbalanceBox: { backgroundColor: "#FBF3DB", borderWidth: 1, borderColor: "#956400", borderRadius: 4, padding: 12, marginBottom: 12 },
  imbalanceText: { fontSize: 10, color: "#956400", fontFamily: "Helvetica-Bold" },
  commercialBox: { backgroundColor: COLORS.offwhite, borderWidth: 1, borderColor: COLORS.lavender, borderRadius: 4, padding: 12, marginBottom: 12 },
  insightRow: { flexDirection: "row", marginBottom: 8, alignItems: "flex-start" },
  insightSquare: { width: 10, height: 10, borderRadius: 2, marginTop: 3, marginRight: 8 },
  insightText: { flex: 1, fontSize: 9, lineHeight: 1.45 },
  footer: {
    position: "absolute",
    bottom: PAGE.footer,
    left: PAGE.margin,
    right: PAGE.margin,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.lavender,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: COLORS.lavender },
  warningText: { fontSize: 8, color: COLORS.lavender, fontStyle: "italic" },
});

const PRIORITY_COLORS = { alta: "#C0392B", media: "#F1C40F", baixa: "#2980B9" };
const DEFAULT_BULLET_COLOR = PRIORITY_COLORS.baixa;
function bulletColor(p) {
  return PRIORITY_COLORS[p] ?? DEFAULT_BULLET_COLOR;
}
const h = React.createElement;

const dims = [
  { name: "Governança e Responsabilidade", nivel: 1, peso: 12 },
  { name: "Patrocínio Executivo e Business Case", nivel: 1, peso: 12 },
  { name: "Arquitetura e Integração", nivel: 2, peso: 12 },
  { name: "Qualidade de Dados", nivel: 1, peso: 12 },
  { name: "Metadados e Rastreabilidade", nivel: 2, peso: 10 },
  { name: "Dados Mestres e Cadastros", nivel: 1, peso: 8 },
  { name: "Segurança e Conformidade (LGPD)", nivel: 2, peso: 10 },
  { name: "Consumo e Autonomia Analítica", nivel: 2, peso: 10 },
  { name: "IA, Modelos e Analytics Avançado", nivel: 1, peso: 6 },
  { name: "Time e Capacidade", nivel: 2, peso: 8 },
];

const input = {
  respondentName: "Rafael Teste - Saúde",
  band: { rotulo: "Inicial", descricao: "Prontuários e dados de pacientes fragmentados. Risco de compliance LGPD/ANS alto." },
  dimensionScores: dims,
  riskDimension: { name: "Governança e Responsabilidade", nivel: 1 },
  imbalance: true,
  commercialAnswer: "Entre R$ 250 mil e R$ 1 milhão",
  analysis: {
    resumo: "Empresa do segmento industrial enfrenta dores típicas de maturidade: falta de dono dos dados, dependência de planilhas e ausência de catálogo de metadados. O mercado tem demonstrado avanço em governança, o que reforça a oportunidade de investimento.",
    dores: [
      { dimensao_id: "d01", dimensao: "Governança e Responsabilidade", dor: "Falta de dono formal dos dados críticos, decisões dependem de pessoas disponíveis.", evidencia_mercado: true, confianca: 0.8 },
      { dimensao_id: "d02", dimensao: "Patrocínio Executivo e Business Case", dor: "Iniciativas de dados sem orçamento dedicado, tratadas como sobra de projetos de TI.", evidencia_mercado: true, confianca: 0.75 },
      { dimensao_id: "d05", dimensao: "Metadados e Rastreabilidade", dor: "Documentação de dados desatualizada, origem dos dados difícil de rastrear.", evidencia_mercado: false, confianca: 0.6 },
    ],
    contexto_concorrentes: [
      { nome: "Consultoria X", contexto: "Oferece programa estruturado de governança com entrega em 12 semanas." },
      { nome: "Plataforma Y", contexto: "Automatiza catálogo de dados e linhagem com onboarding rápido." },
    ],
  },
  insights: {
    bullets: [
      { texto: "Estabelecer dono formal dos dados críticos por domínio, com papéis documentados.", prioridade: "alta" },
      { texto: "Criar business case com orçamento plurianual e patrocinador executivo para as iniciativas de dados.", prioridade: "alta" },
      { texto: "Implantar catálogo de metadados ativo com glossário de negócio.", prioridade: "media" },
      { texto: "Reduzir dependência de planilhas com plataforma de integração padronizada.", prioridade: "media" },
      { texto: "Formalizar papéis do time de dados e plano de capacitação.", prioridade: "baixa" },
    ],
  },
};

// Minimal radar
const RADAR_LEVELS = [1, 2, 3, 4, 5];
const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 120;
const START_ANGLE = -90;
const hh = React.createElement;

function polarPoint(level, index, total, radius) {
  const clamped = Math.min(5, Math.max(1, level));
  const fraction = (clamped - 1) / (RADAR_LEVELS.length - 1);
  const r = radius * fraction;
  const angle = (START_ANGLE + (index * 360) / total) * (Math.PI / 180);
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
}
function pointsString(items) {
  return items.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function RadarChart({ dimensions }) {
  const total = dimensions.length;
  const gridPolys = RADAR_LEVELS.map((level) =>
    hh("Polygon", {
      key: `grid-${level}`,
      points: pointsString(dimensions.map((_, i) => polarPoint(level, i, total, RADIUS))),
      fill: "none",
      stroke: "#D9D5E0",
      strokeWidth: 1,
    })
  );
  const axes = dimensions.map((_, i) => {
    const tip = polarPoint(5, i, total, RADIUS);
    return hh("Line", {
      key: `axis-${i}`,
      x1: CENTER, y1: CENTER, x2: tip.x, y2: tip.y,
      stroke: "#D9D5E0", strokeWidth: 0.75,
    });
  });
  const dataPoly = hh("Polygon", {
    key: "data",
    points: pointsString(dimensions.map((_, i) => polarPoint(dimensions[i].nivel, i, total, RADIUS))),
    fill: "rgba(74,44,125,0.20)",
    stroke: "#4A2C7D",
    strokeWidth: 1.5,
  });
  const labels = dimensions.map((dim, i) => {
    const p = polarPoint(5, i, total, RADIUS);
    const dx = p.x - CENTER;
    const dy = p.y - CENTER;
    const anchorX = Math.abs(dx) < 1 ? CENTER : p.x + Math.sign(dx) * 6;
    const anchorY = p.y + Math.sign(dy) * 4;
    const textAnchor = Math.abs(dx) < 1 ? "middle" : dx > 0 ? "start" : "end";
    return hh("Text", { key: `label-${i}`, x: anchorX, y: anchorY, textAnchor, style: { fontSize: 6, fill: "#4A2C7D" } }, dim.name);
  });
  return hh("Svg", { viewBox: `0 0 ${SIZE} ${SIZE}`, width: SIZE, height: SIZE }, ...gridPolys, ...axes, dataPoly, ...labels);
}

const dimensionRows = input.dimensionScores.map((d, i) =>
  h(View, { key: d.name, style: [styles.tableRow, ...(i % 2 === 1 ? [styles.tableRowAlt] : [])] },
    h(Text, { style: styles.colName }, d.name),
    h(Text, { style: styles.colNivel }, String(d.nivel)),
    h(Text, { style: styles.colPeso }, String(d.peso)),
    h(Text, { style: styles.colScore }, (d.nivel * d.peso).toFixed(0))
  )
);

const pageHeader = h(View, { key: "header", style: styles.header },
  h(Text, { style: styles.headerTitle }, "Diagnóstico de Maturidade de Dados"),
  h(Text, { style: styles.headerSubtitle }, "Rhema Data - Relatório de Autoavaliação")
);
const headerFooter = h(View, { key: "footer", style: styles.footer },
  h(Text, { style: styles.footerText }, `© ${new Date().getFullYear()} Rhema Data - Diagnóstico de Maturidade de Dados`),
  h(Text, { style: styles.footerText, render: ({ pageNumber }) => `${pageNumber}` }, "")
);

const page1Children = [
  pageHeader,
  h(View, { key: "respondent", style: styles.section },
    h(Text, { style: styles.sectionTitle }, "Respondente"),
    h(Text, null, `Nome: ${input.respondentName}`)
  ),
  h(View, { key: "band", style: styles.bandBox },
    h(Text, { style: styles.bandLabel }, input.band.rotulo),
    h(Text, { style: styles.bandDescription }, input.band.descricao)
  ),
  h(View, { key: "radar", style: styles.section },
    h(Text, { style: styles.sectionTitle }, "Radar de Maturidade"),
    h(View, { style: styles.radarBox }, h(RadarChart, { dimensions: input.dimensionScores }))
  ),
];

const page2Children = [
  h(View, { key: "table", style: styles.section },
    h(Text, { style: styles.sectionTitle }, "Scores por Dimensão"),
    h(View, { style: styles.tableHeader },
      h(Text, { style: [styles.tableHeaderText, styles.colName] }, "Dimensão"),
      h(Text, { style: [styles.tableHeaderText, styles.colNivel] }, "Nível"),
      h(Text, { style: [styles.tableHeaderText, styles.colPeso] }, "Peso"),
      h(Text, { style: [styles.tableHeaderText, styles.colScore] }, "Score")
    ),
    ...dimensionRows
  ),
  h(View, { key: "risk", style: styles.riskBox },
    h(Text, { style: styles.riskText },
      `Principal exposição de risco: ${input.riskDimension.name} (nível ${input.riskDimension.nivel})`
    )
  ),
  h(View, { key: "imbalance", style: styles.imbalanceBox },
    h(Text, { style: styles.imbalanceText },
      "Desequilíbrio detectado: diferença superior a 3 níveis entre a maior e a menor dimensão."
    )
  ),
  h(View, { key: "commercial", style: styles.commercialBox },
    h(Text, { style: styles.sectionTitle }, "Estimativa de Impacto"),
    h(Text, null, input.commercialAnswer)
  ),
];

const page3Children = [
  h(View, { key: "analysis", style: styles.section },
    h(Text, { style: styles.sectionTitle }, "Análise de Mercado"),
    h(Text, { style: { fontSize: 9.5, marginBottom: 8 } }, input.analysis.resumo),
    ...input.analysis.dores.map((pain) =>
      h(View, { key: pain.dimensao_id, style: { marginBottom: 6 } },
        h(Text, { style: { fontSize: 9, fontFamily: "Helvetica-Bold" } },
          `${pain.dimensao}${pain.evidencia_mercado ? " - confirmada pelo mercado" : ""}`
        ),
        h(Text, { style: { fontSize: 9 } }, pain.dor)
      )
    )
  ),
  h(View, { key: "competitors", style: styles.section },
    h(Text, { style: styles.sectionTitle }, "Concorrentes"),
    ...input.analysis.contexto_concorrentes.map((c, i) =>
      h(View, { key: `comp-${i}`, style: { marginBottom: 6 } },
        h(Text, { style: { fontSize: 9, fontFamily: "Helvetica-Bold" } }, c.nome),
        h(Text, { style: { fontSize: 9 } }, c.contexto)
      )
    )
  ),
  h(View, { key: "insights", style: styles.section },
    h(Text, { style: styles.sectionTitle }, "Insights Priorizados"),
    ...input.insights.bullets.map((bullet, i) =>
      h(View, { key: `bullet-${i}`, style: styles.insightRow },
        h(View, { style: [styles.insightSquare, { backgroundColor: bulletColor(bullet.prioridade) }] }),
        h(Text, { style: styles.insightText }, [`[${bullet.prioridade.toUpperCase()}] `, bullet.texto])
      )
    )
  ),
  h(View, { key: "warning", style: styles.section },
    h(Text, { style: styles.warningText },
      "Pesos ajustados com base no perfil da empresa (segmento, porte e faturamento). Instrumento de triagem baseado em autoavaliação. Não substitui diagnóstico com evidência documental. Resultado reportado como faixa, não como número exato."
    )
  ),
];

const pages = [
  h(Page, { key: "page-1", size: "A4", style: styles.page }, ...page1Children, headerFooter),
  h(Page, { key: "page-2", size: "A4", style: styles.page }, ...page2Children, headerFooter),
  h(Page, { key: "page-3", size: "A4", style: styles.page }, ...page3Children, headerFooter),
];

const doc = h(Document, null, ...pages);

renderToBuffer(doc)
  .then((buffer) => {
    require("fs").writeFileSync("C:/Users/Rafael/AppData/Local/Temp/opencode/diagnos-sample.pdf", buffer);
    console.log("PDF gerado:", buffer.length, "bytes");
  })
  .catch((err) => {
    console.error("ERRO ao gerar PDF:", err);
    process.exit(1);
  });
