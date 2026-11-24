import React from "react";
import {
  renderToBuffer,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { GeneratePdfInput } from "@/lib/service/screen-service";
import { normalizeInsights } from "@/lib/agents/normalize-insights";
import { INDEX_LABEL, METHOD_NOTE, SCALE_LEGEND } from "@/lib/maturity/methodology";
import { RadarChart } from "./radar-chart";
import { shortDimensionLabel } from "./dimension-label";
import { registerReportFonts } from "./fonts";

const COLORS = {
  primary: "#4A2C7D",
  ink: "#1D1D1F",
  ink2: "#6E6E73",
  ink3: "#707077",
  hairline: "rgba(29,29,31,0.07)",
  hairlineStrong: "rgba(29,29,31,0.12)",
  offwhite: "#F8F7FC",
  white: "#FFFFFF",
  risk: "#B23A34",
  riskSoft: "#F9EAE8",
  amber: "#A9741A",
  amberSoft: "#F9F1E2",
  blue: "#2F6FA8",
  stampBorder: "rgba(29,29,31,0.18)",
  lavenderDark: "#B8B2C2",
};

const PAGE = {
  width: 595,
  height: 842,
  margin: 40,
  footer: 40,
};

const BAND_LABELS = ["Inicial", "Emergente", "Estruturado", "Gerenciado", "Otimizado"];

const PRIORITY_COLORS: Record<string, string> = {
  alta: COLORS.risk,
  media: COLORS.amber,
  baixa: COLORS.blue,
};

const PRIORITY_LABELS: Record<string, string> = {
  alta: "ALTA",
  media: "MÉDIA",
  baixa: "BAIXA",
};

const PT = PAGE.width / 794;
const p = (px: number): number => Math.round(px * PT * 10) / 10;

const styles = StyleSheet.create({
  page: {
    paddingTop: p(53),
    paddingBottom: p(84),
    paddingHorizontal: p(53),
    fontFamily: "Inter",
    fontSize: p(12),
    color: COLORS.ink,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: p(53),
    paddingBottom: p(53),
  },
  footerInner: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairlineStrong,
    paddingTop: p(8),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontFamily: "Inter",
    fontSize: p(9),
    color: COLORS.ink3,
  },

  reportHeader: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairlineStrong,
    paddingBottom: p(12),
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: p(8),
    marginBottom: p(9),
  },
  eyebrowRule: {
    width: p(18),
    height: p(2),
    borderRadius: p(1),
    backgroundColor: COLORS.primary,
  },
  eyebrowLabel: {
    fontFamily: "Inter",
    fontSize: p(9),
    fontWeight: 600,
    letterSpacing: p(1.15),
    color: COLORS.ink3,
  },
  reportTitle: {
    fontFamily: "Poppins",
    fontSize: p(26),
    fontWeight: 600,
    letterSpacing: p(-0.9),
    lineHeight: 1.15,
    color: COLORS.ink,
    marginBottom: p(9),
  },
  reportMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: p(9),
    flexWrap: "wrap",
  },
  metaItem: {
    fontFamily: "Inter",
    fontSize: p(10.5),
    fontWeight: 500,
    color: COLORS.ink2,
  },
  metaDot: {
    width: p(3),
    height: p(3),
    borderRadius: p(1.5),
    backgroundColor: COLORS.lavenderDark,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: p(12),
  },
  sectionIndex: {
    fontFamily: "Inter",
    fontSize: p(11),
    fontWeight: 600,
    letterSpacing: p(1),
    color: COLORS.primary,
  },
  sectionTitle: {
    fontFamily: "Poppins",
    fontSize: p(15),
    fontWeight: 600,
    letterSpacing: p(-0.2),
    lineHeight: 1.3,
    color: COLORS.ink,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.hairlineStrong,
  },
  sectionNote: {
    fontFamily: "Inter",
    fontSize: p(10.5),
    color: COLORS.ink3,
  },

  stageCard: {
    backgroundColor: COLORS.white,
    borderRadius: p(20),
    borderWidth: 1,
    borderColor: COLORS.hairline,
    padding: p(18),
    gap: p(10),
  },
  stageTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stageEyebrow: {
    fontFamily: "Inter",
    fontSize: p(9),
    fontWeight: 600,
    letterSpacing: p(1.15),
    color: COLORS.ink3,
  },
  stageName: {
    fontFamily: "Poppins",
    fontSize: p(28),
    fontWeight: 600,
    letterSpacing: p(-0.8),
    lineHeight: 1.1,
    color: COLORS.primary,
  },
  stageDescription: {
    fontFamily: "Inter",
    fontSize: p(12),
    lineHeight: 1.5,
    color: COLORS.ink2,
  },
  stageScale: {
    gap: p(6),
  },
  scaleLabel: {
    fontFamily: "Inter",
    fontSize: p(10),
    fontWeight: 600,
    letterSpacing: p(1.15),
    color: COLORS.ink3,
  },
  segments: {
    flexDirection: "row",
    gap: p(5),
  },
  segment: {
    flex: 1,
    height: p(6),
    borderRadius: p(999),
    backgroundColor: "rgba(29,29,31,0.08)",
  },
  segmentActive: {
    backgroundColor: COLORS.primary,
  },
  ticks: {
    flexDirection: "row",
    gap: p(5),
  },
  tickCell: {
    flex: 1,
  },
  tick: {
    fontFamily: "Inter",
    fontSize: p(10),
    color: COLORS.ink3,
  },
  tickActive: {
    fontWeight: 600,
    color: COLORS.primary,
  },

  radarWrap: {
    alignItems: "center",
  },
  readingLabel: {
    fontFamily: "Inter",
    fontSize: p(9.5),
    fontWeight: 600,
    letterSpacing: p(1.15),
    color: COLORS.ink3,
    marginBottom: p(8),
  },
  readingText: {
    fontFamily: "Inter",
    fontSize: p(12.5),
    lineHeight: 1.55,
    color: COLORS.ink,
  },
  readingScale: {
    fontFamily: "Inter",
    fontSize: p(10),
    lineHeight: 1.5,
    color: COLORS.ink3,
    marginTop: p(8),
  },

  runningHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairlineStrong,
    paddingBottom: p(9),
  },
  runningHeadLabel: {
    fontFamily: "Inter",
    fontSize: p(9),
    fontWeight: 600,
    letterSpacing: p(1),
    color: COLORS.ink3,
  },
  runningHeadSection: {
    fontFamily: "Inter",
    fontSize: p(10),
    fontWeight: 500,
    color: COLORS.ink2,
  },

  kpiStrip: {
    flexDirection: "row",
    alignItems: "center",
    height: p(77),
    backgroundColor: COLORS.white,
    borderRadius: p(20),
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  kpiCell: {
    flex: 1,
    paddingVertical: p(14),
    paddingHorizontal: p(16),
    gap: p(3),
  },
  kpiDivider: {
    width: 1,
    height: p(77),
    backgroundColor: COLORS.hairline,
  },
  kpiLabel: {
    fontFamily: "Inter",
    fontSize: p(9),
    fontWeight: 600,
    letterSpacing: p(1.15),
    color: COLORS.ink3,
  },
  kpiValue: {
    fontFamily: "Poppins",
    fontSize: p(19),
    fontWeight: 600,
    letterSpacing: p(-0.6),
    lineHeight: 1.1,
    color: COLORS.ink,
  },
  kpiSub: {
    fontFamily: "Inter",
    fontSize: p(9.5),
    color: COLORS.ink2,
  },

  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairlineStrong,
    paddingTop: p(2),
    paddingBottom: p(9),
    paddingHorizontal: p(11),
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    padding: p(11),
  },
  th: {
    fontFamily: "Inter",
    fontSize: p(10),
    fontWeight: 600,
    letterSpacing: p(1.15),
    color: COLORS.ink3,
  },
  colName: {
    fontFamily: "Inter",
    fontSize: p(12),
    fontWeight: 500,
    lineHeight: 1.4,
    color: COLORS.ink,
  },
  nameCell: {
    gap: p(2),
  },
  colArea: {
    fontFamily: "Inter",
    fontSize: p(9.5),
    lineHeight: 1.35,
    color: COLORS.ink3,
  },
  widthName: {
    width: p(321),
  },
  widthCenter: {
    width: p(115),
    textAlign: "center",
  },
  colPeso: {
    width: p(115),
    fontFamily: "Inter",
    fontSize: p(12),
    textAlign: "center",
    color: COLORS.ink2,
  },
  colPesoSetor: {
    width: p(115),
    fontFamily: "Inter",
    fontSize: p(12),
    fontWeight: 600,
    textAlign: "center",
    color: COLORS.ink,
  },
  levelCell: {
    width: p(115),
    flexDirection: "row",
    justifyContent: "center",
  },
  levelBadge: {
    width: p(18),
    height: p(18),
    borderRadius: p(6),
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  levelBadgeText: {
    fontFamily: "Inter",
    fontSize: p(9.5),
    fontWeight: 600,
    color: COLORS.white,
  },

  riskBox: {
    backgroundColor: COLORS.riskSoft,
    borderRadius: p(12),
    borderWidth: 1,
    borderColor: COLORS.risk,
    padding: p(16),
  },
  imbalanceBox: {
    backgroundColor: COLORS.amberSoft,
    borderRadius: p(12),
    borderWidth: 1,
    borderColor: COLORS.amber,
    padding: p(16),
  },
  noteText: {
    fontFamily: "Inter",
    fontSize: p(12),
    fontWeight: 600,
    lineHeight: 1.5,
    color: COLORS.ink,
  },
  commercialBox: {
    backgroundColor: COLORS.offwhite,
    borderRadius: p(16),
    borderWidth: 1,
    borderColor: COLORS.hairlineStrong,
    padding: p(16),
    gap: p(8),
  },
  commercialTitle: {
    fontFamily: "Poppins",
    fontSize: p(14),
    fontWeight: 600,
    letterSpacing: p(-0.2),
    color: COLORS.ink,
  },
  commercialText: {
    fontFamily: "Inter",
    fontSize: p(12.5),
    lineHeight: 1.55,
    color: COLORS.ink2,
  },

  analysisSummary: {
    fontFamily: "Inter",
    fontSize: p(12.5),
    lineHeight: 1.6,
    color: COLORS.ink,
  },
  pain: {
    paddingBottom: p(12),
  },
  painTitle: {
    fontFamily: "Poppins",
    fontSize: p(12.5),
    fontWeight: 600,
    letterSpacing: p(-0.2),
    lineHeight: 1.35,
    color: COLORS.ink,
    marginBottom: p(4),
  },
  painText: {
    fontFamily: "Inter",
    fontSize: p(12),
    lineHeight: 1.55,
    color: COLORS.ink2,
  },
  competitor: {
    paddingBottom: p(12),
  },
  competitorHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: p(9),
    marginBottom: p(4),
  },
  avatar: {
    width: p(26),
    height: p(26),
    borderRadius: p(3),
    borderWidth: 1,
    borderColor: COLORS.stampBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontFamily: "Inter",
    fontSize: p(8.5),
    fontWeight: 600,
    letterSpacing: p(0.5),
    color: COLORS.ink,
  },
  competitorName: {
    fontFamily: "Poppins",
    fontSize: p(14),
    fontWeight: 600,
    letterSpacing: p(-0.2),
    color: COLORS.ink,
  },
  competitorText: {
    fontFamily: "Inter",
    fontSize: p(12),
    lineHeight: 1.55,
    color: COLORS.ink2,
  },
  insight: {
    flexDirection: "row",
    alignItems: "center",
    gap: p(11),
    paddingTop: p(8),
    paddingBottom: p(14),
  },
  insightNumber: {
    fontFamily: "Inter",
    fontSize: p(11),
    fontWeight: 600,
    letterSpacing: p(0.4),
    color: COLORS.ink3,
  },
  priorityChip: {
    width: p(78),
    flexDirection: "row",
    alignItems: "center",
    gap: p(5),
    borderWidth: 1,
    borderColor: COLORS.stampBorder,
    borderRadius: p(2),
    paddingVertical: p(3),
    paddingHorizontal: p(7),
  },
  priorityMarker: {
    width: p(5),
    height: p(5),
    borderRadius: p(1),
  },
  priorityText: {
    fontFamily: "Inter",
    fontSize: p(8.5),
    fontWeight: 600,
    letterSpacing: p(0.9),
    color: COLORS.ink,
  },
  insightBody: {
    flex: 1,
    fontFamily: "Inter",
    fontSize: p(12),
    lineHeight: 1.55,
    color: COLORS.ink,
  },
  methodNote: {
    backgroundColor: COLORS.offwhite,
    borderRadius: p(12),
    borderWidth: 1,
    borderColor: COLORS.hairline,
    paddingVertical: p(14),
    paddingHorizontal: p(16),
    gap: p(6),
  },
  noteLabel: {
    fontFamily: "Inter",
    fontSize: p(9.5),
    fontWeight: 600,
    letterSpacing: p(1.15),
    color: COLORS.ink3,
  },
  noteBody: {
    fontFamily: "Inter",
    fontSize: p(11),
    lineHeight: 1.55,
    color: COLORS.ink2,
  },
});

const h = React.createElement;

function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function bandIndex(rotulo: string): number | null {
  const normalized = normalizeLabel(rotulo);
  const index = BAND_LABELS.findIndex((label) => normalizeLabel(label) === normalized);
  return index >= 0 ? index + 1 : null;
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function buildRadarReading(input: GeneratePdfInput): string {
  const dimensions = input.dimensionScores;
  const total = dimensions.length;
  if (total === 0) return "";

  const levels = dimensions.map((dimension) => dimension.nivel);
  const maxLevel = Math.max(...levels);
  const atMax = dimensions.filter((dimension) => dimension.nivel === maxLevel);
  const rest = dimensions.filter((dimension) => dimension.nivel !== maxLevel);

  if (rest.length === 0) {
    return `As ${total} dimensões estão em nível ${maxLevel} — patamar único, sem dispersão entre áreas.`;
  }

  const names = joinNames(atMax.map((dimension) => shortDimensionLabel(dimension.name)));
  const restLevels = [...new Set(rest.map((dimension) => dimension.nivel))].sort(
    (a, b) => a - b,
  );
  const restPhrase =
    restLevels.length === 1
      ? `As demais seguem em nível ${restLevels[0]}`
      : `As demais se distribuem entre os níveis ${restLevels[0]} e ${
          restLevels[restLevels.length - 1]
        }`;

  return `${atMax.length} das ${total} dimensões ${
    atMax.length === 1 ? "está" : "estão"
  } em nível ${maxLevel} — ${names}. ${restPhrase}, com ${
    input.riskDimension.name
  } concentrando a exposição de risco.`;
}

function buildPriorityReading(bullets: { prioridade: string }[]): string {
  const counts = { alta: 0, media: 0, baixa: 0 };
  for (const bullet of bullets) {
    if (bullet.prioridade in counts) {
      counts[bullet.prioridade as keyof typeof counts] += 1;
    }
  }

  const parts: string[] = [];
  if (counts.alta > 0) {
    parts.push(
      `${counts.alta} ${counts.alta === 1 ? "prioridade alta" : "prioridades altas"}`,
    );
  }
  if (counts.media > 0) {
    parts.push(`${counts.media} ${counts.media === 1 ? "média" : "médias"}`);
  }
  if (counts.baixa > 0) {
    parts.push(`${counts.baixa} ${counts.baixa === 1 ? "baixa" : "baixas"}`);
  }

  if (parts.length === 0) return "";

  const summary = joinNames(parts);
  const capitalized = `${summary.charAt(0).toUpperCase()}${summary.slice(1)}`;

  if (counts.alta > 0) {
    return `${capitalized}. As altas pedem ação imediata; as médias entram no próximo ciclo; as baixas são capacidade a desenvolver.`;
  }
  if (counts.media > 0) {
    return `${capitalized}. Sem prioridade alta: o foco é consolidar a base antes de ampliar escopo, com as médias entrando no próximo ciclo.`;
  }
  return `${capitalized}. Sem prioridade alta ou média: o foco é consolidar a base antes de ampliar escopo.`;
}

function metaItem(label: string, key: string) {
  return h(Text, { key, style: styles.metaItem }, label);
}

function metaDot(key: string) {
  return h(View, { key, style: styles.metaDot });
}

function locationLabel(location: GeneratePdfInput["location"]): string | null {
  if (!location) return null;
  const city = location.city.trim();
  const state = location.state.trim();
  if (city === "" || state === "") return null;
  return `${city}/${state}`;
}

function sectionHeader(index: string, title: string, note: string, key: string) {
  return h(
    View,
    { key, style: styles.sectionHeader, wrap: false },
    h(Text, { style: styles.sectionIndex }, index),
    h(Text, { style: styles.sectionTitle }, title),
    h(View, { style: styles.sectionRule }),
    h(Text, { style: styles.sectionNote }, note),
  );
}

function spacer(height: number, key: string) {
  return h(View, { key, style: { height: p(height) } });
}

function footer() {
  return h(
    View,
    { key: "footer", style: styles.footer, fixed: true },
    h(
      View,
      { style: styles.footerInner },
      h(
        Text,
        { style: styles.footerText },
        `© ${new Date().getFullYear()} Rhema Data - Diagnóstico de Maturidade de Dados`,
      ),
      h(Text, {
        style: styles.footerText,
        render: ({
          pageNumber,
          totalPages,
        }: {
          pageNumber: number;
          totalPages: number;
        }) => `Página ${pageNumber} de ${totalPages}`,
      }, ""),
    ),
  );
}

function reportHeader(input: GeneratePdfInput) {
  const location = locationLabel(input.location);
  const meta: ReturnType<typeof h>[] = [metaItem(input.respondentName, "meta-name")];

  if (location) {
    meta.push(metaDot("meta-dot-location"), metaItem(location, "meta-location"));
  }

  meta.push(
    metaDot("meta-dot-1"),
    metaItem("Rhema Data", "meta-company"),
    metaDot("meta-dot-2"),
    metaItem(`${input.dimensionScores.length} dimensões`, "meta-dims"),
    metaDot("meta-dot-3"),
    metaItem("Autoavaliação", "meta-method"),
  );

  return h(
    View,
    { key: "header", style: styles.reportHeader, wrap: false },
    h(
      View,
      { style: styles.eyebrow },
      h(View, { style: styles.eyebrowRule }),
      h(Text, { style: styles.eyebrowLabel }, "RELATÓRIO DE AUTOAVALIAÇÃO"),
    ),
    h(Text, { style: styles.reportTitle }, "Diagnóstico de Maturidade de Dados"),
    h(View, { style: styles.reportMeta }, ...meta),
  );
}

function stageCard(input: GeneratePdfInput, stage: number) {
  const segments = BAND_LABELS.map((_, index) =>
    h(View, {
      key: `segment-${index}`,
      style: [styles.segment, ...(index < stage ? [styles.segmentActive] : [])],
    }),
  );

  const ticks = BAND_LABELS.map((label, index) =>
    h(
      View,
      { key: `tick-${index}`, style: styles.tickCell },
      h(
        Text,
        { style: [styles.tick, ...(index === stage - 1 ? [styles.tickActive] : [])] },
        label,
      ),
    ),
  );

  return h(
    View,
    { key: "stage", style: styles.stageCard, wrap: false },
    h(
      View,
      { style: styles.stageTop },
      h(Text, { style: styles.stageEyebrow }, INDEX_LABEL),
      h(Text, { style: styles.stageEyebrow }, `FAIXA ${stage} DE 5`),
    ),
    h(Text, { style: styles.stageName }, input.band.rotulo),
    h(Text, { style: styles.stageDescription }, input.band.descricao),
    h(
      View,
      { style: styles.stageScale },
      h(Text, { style: styles.scaleLabel }, "PROGRESSÃO NA ESCALA"),
      h(View, { style: styles.segments }, ...segments),
      h(View, { style: styles.ticks }, ...ticks),
    ),
  );
}

function radarReading(input: GeneratePdfInput) {
  return h(
    View,
    { key: "reading", wrap: false },
    h(Text, { style: styles.readingLabel }, "LEITURA DO RADAR"),
    h(Text, { style: styles.readingText }, buildRadarReading(input)),
    h(
      Text,
      { style: styles.readingScale },
      SCALE_LEGEND,
    ),
  );
}

function kpiStrip(input: GeneratePdfInput) {
  const dimensions = input.dimensionScores;
  const total = dimensions.length;
  const hasDimensions = total > 0;
  const levels = dimensions.map((dimension) => dimension.nivel);
  const minLevel = hasDimensions ? Math.min(...levels) : 0;
  const maxLevel = hasDimensions ? Math.max(...levels) : 0;
  const atMin = dimensions.filter((dimension) => dimension.nivel === minLevel).length;
  const atMax = dimensions.filter((dimension) => dimension.nivel === maxLevel).length;
  const topWeight = dimensions.reduce(
    (top, dimension) => (top === null || dimension.peso > top.peso ? dimension : top),
    null as GeneratePdfInput["dimensionScores"][number] | null,
  );
  const stage = bandIndex(input.band.rotulo) ?? 1;

  const cells = [
    {
      label: "ESTÁGIO ATUAL",
      value: input.band.rotulo,
      sub: `Faixa ${stage} de 5`,
    },
    {
      label: hasDimensions ? `DIMENSÕES EM NÍVEL ${minLevel}` : "DIMENSÕES AVALIADAS",
      value: hasDimensions ? String(atMin) : "0",
      sub: hasDimensions ? `de ${total} avaliadas` : "sem respostas",
    },
    {
      label: "MAIOR PESO",
      value: topWeight ? shortDimensionLabel(topWeight.name) : "—",
      sub: topWeight ? `peso ${topWeight.peso} · nível ${topWeight.nivel}` : "sem dados",
    },
    {
      label: hasDimensions ? `DIMENSÕES EM NÍVEL ${maxLevel}` : "ESCALA",
      value: hasDimensions ? String(atMax) : "1–5",
      sub: hasDimensions
        ? maxLevel === minLevel
          ? "patamar único"
          : "mais avançadas"
        : "níveis de maturidade",
    },
  ];

  const children: ReturnType<typeof h>[] = [];
  cells.forEach((cell, index) => {
    if (index > 0) {
      children.push(h(View, { key: `divider-${index}`, style: styles.kpiDivider }));
    }
    children.push(
      h(
        View,
        { key: `kpi-${index}`, style: styles.kpiCell },
        h(Text, { style: styles.kpiLabel }, cell.label),
        h(Text, { style: styles.kpiValue }, cell.value),
        h(Text, { style: styles.kpiSub }, cell.sub),
      ),
    );
  });

  return h(View, { key: "kpi", style: styles.kpiStrip, wrap: false }, ...children);
}

function dimensionTable(input: GeneratePdfInput) {
  const rows = input.dimensionScores.map((dimension, index) =>
    h(
      View,
      { key: `row-${index}`, style: styles.tableRow, wrap: false },
      h(
        View,
        { style: [styles.widthName, styles.nameCell] },
        h(Text, { style: styles.colName }, dimension.name),
        dimension.areaDmbok
          ? h(Text, { style: styles.colArea }, dimension.areaDmbok)
          : null,
      ),
      h(
        View,
        { style: styles.levelCell },
        h(
          View,
          { style: styles.levelBadge },
          h(Text, { style: styles.levelBadgeText }, String(dimension.nivel)),
        ),
      ),
      h(Text, { style: styles.colPesoSetor }, `${dimension.peso}%`),
      h(Text, { style: styles.colPeso }, `${dimension.pesoPadrao}%`),
    ),
  );

  return h(
    View,
    { key: "table" },
    h(
      View,
      { style: styles.tableHeader, wrap: false },
      h(Text, { style: [styles.th, styles.widthName] }, "DIMENSÃO"),
      h(Text, { style: [styles.th, styles.widthCenter] }, "NÍVEL"),
      h(Text, { style: [styles.th, styles.widthCenter] }, "PESO NO SETOR"),
      h(Text, { style: [styles.th, styles.widthCenter] }, "PESO PADRÃO"),
    ),
    ...rows,
  );
}

function noteBox(
  key: string,
  style: (typeof styles)["riskBox"] | (typeof styles)["imbalanceBox"],
  text: string,
) {
  return h(
    View,
    { key, style, wrap: false },
    h(Text, { style: styles.noteText }, text),
  );
}

function methodNote(key: string) {
  return h(
    View,
    { key, style: styles.methodNote, wrap: false },
    h(Text, { style: styles.noteLabel }, "NOTA METODOLÓGICA"),
    h(Text, { style: styles.noteBody }, METHOD_NOTE),
  );
}

function pageOne(input: GeneratePdfInput) {
  const stage = bandIndex(input.band.rotulo) ?? 1;
  const children: ReturnType<typeof h>[] = [
    reportHeader(input),
    spacer(20, "space-1"),
    sectionHeader("01", "Leitura do estágio", "Escala de 1 a 5", "section-1"),
    spacer(10, "space-2"),
    stageCard(input, stage),
  ];

  if (input.dimensionScores.length > 0) {
    children.push(
      spacer(20, "space-3"),
      sectionHeader(
        "02",
        "Radar de maturidade",
        `${input.dimensionScores.length} dimensões · níveis de 1 a 5`,
        "section-2",
      ),
      spacer(10, "space-4"),
      h(
        View,
        { key: "radar-wrap", style: styles.radarWrap },
        h(RadarChart, { dimensions: input.dimensionScores }),
      ),
      spacer(16, "space-5"),
      radarReading(input),
    );
  }

  return h(Page, { key: "page-1", size: "A4", style: styles.page }, ...children, footer());
}

function pageTwo(input: GeneratePdfInput, includeMethodNote: boolean) {
  const children: ReturnType<typeof h>[] = [
    h(
      View,
      { key: "running-head", style: styles.runningHead, wrap: false },
      h(
        Text,
        { style: styles.runningHeadLabel },
        "DIAGNÓSTICO DE MATURIDADE DE DADOS · RHEMA DATA",
      ),
      h(Text, { style: styles.runningHeadSection }, "Scores e risco"),
    ),
    spacer(22, "space-1"),
    kpiStrip(input),
    spacer(20, "space-2"),
    sectionHeader(
      "01",
      "Scores por dimensão",
      `${input.dimensionScores.length} dimensões · peso e score`,
      "section-1",
    ),
    spacer(10, "space-3"),
    dimensionTable(input),
    spacer(24, "space-4"),
    sectionHeader("02", "Exposição e impacto", "Riscos e estimativa", "section-2"),
    spacer(10, "space-5"),
    noteBox(
      "risk",
      styles.riskBox,
      `Principal exposição de risco: ${input.riskDimension.name} (nível ${input.riskDimension.nivel})`,
    ),
  ];

  if (input.imbalance) {
    children.push(
      spacer(20, "space-6"),
      noteBox(
        "imbalance",
        styles.imbalanceBox,
        "Desequilíbrio detectado: diferença superior a 3 níveis entre a maior e a menor dimensão.",
      ),
    );
  }

  if (input.commercialAnswer.trim() !== "") {
    children.push(
      spacer(20, "space-7"),
      h(
        View,
        { key: "commercial", style: styles.commercialBox, wrap: false },
        h(Text, { style: styles.commercialTitle }, "Estimativa de Impacto"),
        h(Text, { style: styles.commercialText }, input.commercialAnswer),
      ),
    );
  }

  if (includeMethodNote) {
    children.push(spacer(8, "space-8"), methodNote("method"));
  }

  return h(Page, { key: "page-2", size: "A4", style: styles.page }, ...children, footer());
}

function pageThree(input: GeneratePdfInput) {
  const children: ReturnType<typeof h>[] = [
    h(
      View,
      { key: "running-head", style: styles.runningHead, wrap: false },
      h(
        Text,
        { style: styles.runningHeadLabel },
        "DIAGNÓSTICO DE MATURIDADE DE DADOS · RHEMA DATA",
      ),
      h(Text, { style: styles.runningHeadSection }, "Análise de mercado"),
    ),
    spacer(22, "space-1"),
  ];

  let section = 0;
  const nextSection = () => String((section += 1)).padStart(2, "0");

  if (input.analysis) {
    const pains = input.analysis.dores.slice(0, 3);
    const competitors = input.analysis.contexto_concorrentes.slice(0, 2);

    children.push(
      sectionHeader(
        nextSection(),
        "Análise de mercado",
        "Contexto e dores",
        "section-analysis",
      ),
      spacer(12, "space-2"),
      h(
        Text,
        { key: "analysis-summary", style: styles.analysisSummary },
        input.analysis.resumo,
      ),
      spacer(12, "space-3"),
    );

    pains.forEach((pain, index) => {
      children.push(
        h(
          View,
          { key: `pain-${index}`, style: styles.pain, wrap: false },
          h(
            Text,
            { style: styles.painTitle },
            `${pain.dimensao}${pain.evidencia_mercado ? " - confirmada pelo mercado" : ""}`,
          ),
          h(Text, { style: styles.painText }, pain.dor),
        ),
      );
    });

    if (competitors.length > 0) {
      children.push(
        spacer(24, "space-4"),
        sectionHeader(
          nextSection(),
          "Concorrentes",
          competitors.length === 1
            ? "Um concorrente analisado"
            : `${competitors.length} concorrentes analisados`,
          "section-competitors",
        ),
        spacer(12, "space-5"),
      );

      competitors.forEach((competitor, index) => {
        children.push(
          h(
            View,
            { key: `competitor-${index}`, style: styles.competitor, wrap: false },
            h(
              View,
              { style: styles.competitorHead },
              h(
                View,
                { style: styles.avatar },
                h(Text, { style: styles.avatarText }, initials(competitor.nome)),
              ),
              h(Text, { style: styles.competitorName }, competitor.nome),
            ),
            h(Text, { style: styles.competitorText }, competitor.contexto),
          ),
        );
      });
    }
  }

  const bullets = normalizeInsights(input.insights?.bullets ?? []).slice(0, 4);
  if (bullets.length > 0) {
    children.push(
      spacer(24, "space-6"),
      sectionHeader(
        nextSection(),
        "Insights priorizados",
        "Ordenados por prioridade",
        "section-insights",
      ),
      spacer(12, "space-7"),
    );

    bullets.forEach((bullet, index) => {
      children.push(
        h(
          View,
          { key: `insight-${index}`, style: styles.insight, wrap: false },
          h(
            Text,
            { style: styles.insightNumber },
            String(index + 1).padStart(2, "0"),
          ),
          h(
            View,
            { style: styles.priorityChip },
            h(View, {
              style: [
                styles.priorityMarker,
                { backgroundColor: PRIORITY_COLORS[bullet.prioridade] ?? COLORS.blue },
              ],
            }),
            h(
              Text,
              { style: styles.priorityText },
              PRIORITY_LABELS[bullet.prioridade] ?? "BAIXA",
            ),
          ),
          h(Text, { style: styles.insightBody }, bullet.texto),
        ),
      );
    });

    children.push(
      spacer(24, "space-8"),
      h(
        View,
        { key: "priority-reading", wrap: false },
        h(Text, { style: styles.readingLabel }, "LEITURA DAS PRIORIDADES"),
        h(Text, { style: styles.readingText }, buildPriorityReading(bullets)),
      ),
      spacer(16, "space-9"),
    );
  } else {
    children.push(spacer(20, "space-9"));
  }

  children.push(methodNote("method"));

  return h(Page, { key: "page-3", size: "A4", style: styles.page }, ...children, footer());
}

function buildPages(input: GeneratePdfInput): ReturnType<typeof h>[] {
  const hasAnalysis = Boolean(input.analysis);
  const hasInsights = (input.insights?.bullets.length ?? 0) > 0;
  const hasPageThree = hasAnalysis || hasInsights;

  return [
    pageOne(input),
    pageTwo(input, !hasPageThree),
    ...(hasPageThree ? [pageThree(input)] : []),
  ];
}

export function buildReportChildren(input: GeneratePdfInput): ReturnType<typeof h>[] {
  return buildPages(input);
}

export function ScreenerReport({ input }: { input: GeneratePdfInput }) {
  const pages = buildPages(input);
  return h(
    Document,
    {
      title: "Diagnóstico de Maturidade de Dados",
      author: "Rhema Data",
      subject: "Relatório de autoavaliação de maturidade de dados",
      creator: "Diagnos Data App",
    },
    ...pages,
  );
}

export async function generateScreenerPdf(
  input: GeneratePdfInput,
): Promise<{ pdf: Buffer; filename: string }> {
  registerReportFonts();

  const element = React.createElement(ScreenerReport, { input });
  const buffer = await renderToBuffer(element as never);

  const filename = `diagnostico-${input.respondentName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}.pdf`;

  return { pdf: buffer, filename };
}
