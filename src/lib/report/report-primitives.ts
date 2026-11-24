import React from "react";
import { StyleSheet, Text, View } from "@react-pdf/renderer";

export const COLORS = {
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

export const PAGE = {
  width: 595,
  height: 842,
  margin: 40,
  footer: 40,
};

export const PT = PAGE.width / 794;
export const p = (px: number): number => Math.round(px * PT * 10) / 10;

export const styles = StyleSheet.create({
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

export const h = React.createElement;

export function sectionHeader(index: string, title: string, note: string, key: string) {
  return h(
    View,
    { key, style: styles.sectionHeader, wrap: false },
    h(Text, { style: styles.sectionIndex }, index),
    h(Text, { style: styles.sectionTitle }, title),
    h(View, { style: styles.sectionRule }),
    h(Text, { style: styles.sectionNote }, note),
  );
}

export function spacer(height: number, key: string) {
  return h(View, { key, style: { height: p(height) } });
}

export function footer() {
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

export function runningHead(label: string, section: string) {
  return h(
    View,
    { key: "running-head", style: styles.runningHead, wrap: false },
    h(Text, { style: styles.runningHeadLabel }, label),
    h(Text, { style: styles.runningHeadSection }, section),
  );
}
