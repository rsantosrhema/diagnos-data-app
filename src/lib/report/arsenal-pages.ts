import { Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CommercialArsenal } from "@/lib/agents/commercial-types";
import { COMMERCIAL_CATALOG } from "@/lib/comercial/catalog";
import { getDimensionById } from "@/lib/screener/contract";
import { shortDimensionLabel } from "./dimension-label";
import {
  COLORS,
  footer,
  h,
  p,
  runningHead,
  sectionHeader,
  spacer,
  styles,
} from "./report-primitives";

const ARSENAL_RUNNING_HEAD = "ARSENAL COMERCIAL · USO INTERNO · CONFIDENCIAL";
const PRELIMINARY_CATALOG_NOTE =
  "Catálogo de serviços preliminar: validar antes de ofertar";

const SPIN_LABELS: Record<
  CommercialArsenal["perguntas"][number]["spin"],
  string
> = {
  situacao: "SITUAÇÃO",
  problema: "PROBLEMA",
  implicacao: "IMPLICAÇÃO",
  necessidade: "NECESSIDADE",
};

const arsenalStyles = StyleSheet.create({
  pointCard: {
    paddingBottom: p(12),
  },
  objectionCard: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    padding: p(10),
  },
  questionRow: {
    flexDirection: "row",
    gap: p(11),
    paddingBottom: p(10),
  },
  questionChip: {
    width: p(86),
  },
  chipColumn: {
    gap: p(4),
  },
  questionBody: {
    flex: 1,
    gap: p(3),
  },
  questionText: {
    fontFamily: "Inter",
    fontSize: p(12),
    lineHeight: 1.55,
    color: COLORS.ink,
  },
});

type Catalog = typeof COMMERCIAL_CATALOG;

function dimensionNames(ids: string[]): string {
  return ids
    .map((id) => shortDimensionLabel(getDimensionById(id)?.nome ?? id))
    .join(", ");
}

function keyPointCard(
  point: CommercialArsenal["pontos_chave"][number],
  index: number,
) {
  return h(
    View,
    { key: `arsenal-point-${index}`, style: arsenalStyles.pointCard, wrap: false },
    h(Text, { style: styles.painTitle }, point.titulo),
    h(Text, { style: styles.painText }, point.texto),
    h(
      Text,
      { style: styles.colArea },
      `Dimensões: ${dimensionNames(point.dimensao_ids)}`,
    ),
  );
}

function serviceCard(
  service: CommercialArsenal["servico_recomendado"],
  catalog: Catalog,
) {
  const name =
    catalog.servicos.find((item) => item.id === service.servico_id)?.nome ??
    service.servico_id;
  const complementary = (service.complementares ?? []).map(
    (id) => catalog.servicos.find((item) => item.id === id)?.nome ?? id,
  );

  const children: ReturnType<typeof h>[] = [
    h(Text, { key: "service-eyebrow", style: styles.readingLabel }, "SERVIÇO RECOMENDADO"),
    h(Text, { key: "service-name", style: styles.commercialTitle }, name),
    h(
      Text,
      { key: "service-justification", style: styles.commercialText },
      service.justificativa,
    ),
    h(
      Text,
      { key: "service-dimensions", style: styles.colArea },
      `Dimensões atacadas: ${dimensionNames(service.dimensoes_atacadas)}`,
    ),
  ];

  if (complementary.length > 0) {
    children.push(
      h(
        Text,
        { key: "service-complementary", style: styles.colArea },
        `Complementares: ${complementary.join(", ")}`,
      ),
    );
  }

  return h(
    View,
    { key: "arsenal-service", style: styles.commercialBox, wrap: false },
    ...children,
  );
}

function preliminaryCatalogNote() {
  return h(
    View,
    { key: "arsenal-catalog-note", style: styles.methodNote, wrap: false },
    h(Text, { style: styles.noteLabel }, "NOTA"),
    h(Text, { style: styles.noteBody }, PRELIMINARY_CATALOG_NOTE),
  );
}

function objectionCard(
  objection: CommercialArsenal["objecoes"][number],
  index: number,
  catalog: Catalog,
) {
  const groupName =
    catalog.grupos.find((group) => group.id === objection.grupo)?.nome ??
    objection.grupo;

  const block = (label: string, text: string, key: string) => [
    h(Text, { key: `${key}-label`, style: styles.readingLabel }, label),
    h(Text, { key: `${key}-text`, style: styles.painText }, text),
  ];

  return h(
    View,
    { key: `arsenal-objection-${index}`, style: arsenalStyles.objectionCard, wrap: false },
    h(Text, { style: styles.competitorName }, groupName),
    ...block("OBJEÇÃO PROVÁVEL", objection.objecao_provavel, "objection"),
    ...block("CONTORNO", objection.contorno, "objection-handling"),
    ...block("APOIO NO DIAGNÓSTICO", objection.apoio, "objection-support"),
  );
}

function arsenalPageOne(arsenal: CommercialArsenal, catalog: Catalog) {
  const children: ReturnType<typeof h>[] = [
    runningHead(ARSENAL_RUNNING_HEAD, "Pontos-chave e serviço ideal"),
    spacer(22, "arsenal-1-space-1"),
    sectionHeader(
      "01",
      "Pontos-chave para a reunião",
      `${arsenal.pontos_chave.length} pontos`,
      "section-arsenal-1",
    ),
    spacer(12, "arsenal-1-space-2"),
    ...arsenal.pontos_chave.map(keyPointCard),
    spacer(24, "arsenal-1-space-3"),
    sectionHeader("02", "Serviço ideal", "Recomendação principal", "section-arsenal-2"),
    spacer(12, "arsenal-1-space-4"),
    serviceCard(arsenal.servico_recomendado, catalog),
  ];

  if (catalog.status === "rascunho") {
    children.push(preliminaryCatalogNote());
  }

  return h(Page, { key: "arsenal-1", size: "A4", style: styles.page }, ...children, footer());
}

function arsenalPageTwo(arsenal: CommercialArsenal, catalog: Catalog) {
  const count = arsenal.objecoes.length;

  return h(
    Page,
    { key: "arsenal-2", size: "A4", style: styles.page },
    runningHead(ARSENAL_RUNNING_HEAD, "Contorno de objeções"),
    spacer(22, "arsenal-2-space-1"),
    sectionHeader(
      "03",
      "Contorno de objeções",
      `${count} ${count === 1 ? "grupo" : "grupos"}`,
      "section-arsenal-3",
    ),
    spacer(12, "arsenal-2-space-2"),
    ...arsenal.objecoes.map((objection, index) =>
      objectionCard(objection, index, catalog),
    ),
    footer(),
  );
}

function questionChip(label: string, markerColor: string, key: string) {
  return h(
    View,
    { key, style: [styles.priorityChip, arsenalStyles.questionChip] },
    h(View, {
      style: [styles.priorityMarker, { backgroundColor: markerColor }],
    }),
    h(Text, { style: styles.priorityText }, label),
  );
}

function questionRow(
  question: CommercialArsenal["perguntas"][number],
  index: number,
) {
  const formatLabel = question.formato === "aberta" ? "ABERTA" : "FECHADA";
  const formatColor =
    question.formato === "aberta" ? COLORS.primary : COLORS.blue;

  return h(
    View,
    { key: `arsenal-question-${index}`, style: arsenalStyles.questionRow, wrap: false },
    h(Text, { style: styles.insightNumber }, String(index + 1).padStart(2, "0")),
    h(
      View,
      { key: "chips", style: arsenalStyles.chipColumn },
      questionChip(formatLabel, formatColor, "chip-format"),
      questionChip(SPIN_LABELS[question.spin], COLORS.ink3, "chip-stage"),
    ),
    h(
      View,
      { key: "body", style: arsenalStyles.questionBody },
      h(Text, { style: arsenalStyles.questionText }, question.texto),
      h(Text, { style: styles.colArea }, `Objetivo: ${question.objetivo}`),
    ),
  );
}

function arsenalPageThree(arsenal: CommercialArsenal) {
  return h(
    Page,
    { key: "arsenal-3", size: "A4", style: styles.page },
    runningHead(ARSENAL_RUNNING_HEAD, "Perguntas SPIN"),
    spacer(22, "arsenal-3-space-1"),
    sectionHeader(
      "04",
      "Perguntas de descoberta (SPIN)",
      "10 perguntas · abertas e fechadas",
      "section-arsenal-4",
    ),
    spacer(12, "arsenal-3-space-2"),
    ...arsenal.perguntas.map(questionRow),
    footer(),
  );
}

export function buildArsenalPages(
  arsenal: CommercialArsenal,
  catalog: Catalog = COMMERCIAL_CATALOG,
): ReturnType<typeof h>[] {
  return [
    arsenalPageOne(arsenal, catalog),
    arsenalPageTwo(arsenal, catalog),
    arsenalPageThree(arsenal),
  ];
}
