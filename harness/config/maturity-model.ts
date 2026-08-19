import type { Dimension, DimensionId, MaturityLevel } from "../core/types";

export const MATURITY_LEVELS: Record<MaturityLevel, string> = {
  0: "Non-existent",
  1: "Initial / Ad hoc",
  2: "Repeatable",
  3: "Defined",
  4: "Managed",
  5: "Optimized",
};

export const DIMENSIONS: Dimension[] = [
  {
    id: "data-governance",
    name: "Data Governance",
    description: "Policies, roles, and accountability for data management.",
  },
  {
    id: "data-architecture",
    name: "Data Architecture",
    description: "Blueprint for data assets and their flow across the enterprise.",
  },
  {
    id: "data-quality",
    name: "Data Quality",
    description: "Fitness of data for its intended use.",
  },
  {
    id: "data-modeling",
    name: "Data Modeling & Design",
    description: "Design of data structures and relationships.",
  },
  {
    id: "data-storage-operations",
    name: "Data Storage & Operations",
    description: "Infrastructure and operational management of data.",
  },
  {
    id: "data-security",
    name: "Data Security",
    description: "Protection of data from unauthorized access and loss.",
  },
  {
    id: "data-integration",
    name: "Data Integration & Interoperability",
    description: "Combining data from different sources into a unified view.",
  },
  {
    id: "data-analytics",
    name: "Data & Analytics",
    description: "Use of data for insight, reporting, and decision-making.",
  },
  {
    id: "metadata",
    name: "Metadata",
    description: "Management of data about data.",
  },
  {
    id: "reference-master-data",
    name: "Reference & Master Data",
    description: "Management of shared reference and master data.",
  },
];

export const DIMENSION_BY_ID: Record<DimensionId, Dimension> = DIMENSIONS.reduce(
  (acc, dimension) => {
    acc[dimension.id] = dimension;
    return acc;
  },
  {} as Record<DimensionId, Dimension>,
);

export function levelFromScore(score: number): MaturityLevel {
  const clamped = Math.max(0, Math.min(5, score));
  return Math.round(clamped) as MaturityLevel;
}

export function levelLabel(level: MaturityLevel): string {
  return MATURITY_LEVELS[level];
}

export function weightedAggregate(
  scores: { score: number; weight: number }[],
): number {
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = scores.reduce((sum, s) => sum + s.score * s.weight, 0);
  return weighted / totalWeight;
}
