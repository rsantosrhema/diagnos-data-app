import type { Question } from "../core/types";

const OPTIONS = [
  { value: 0, label: "Non-existent", description: "No awareness or activity." },
  { value: 1, label: "Initial", description: "Ad hoc, individual efforts." },
  { value: 2, label: "Repeatable", description: "Informal but repeatable practices." },
  { value: 3, label: "Defined", description: "Documented and standardized." },
  { value: 4, label: "Managed", description: "Measured and controlled." },
  { value: 5, label: "Optimized", description: "Continuously improved." },
];

export const QUESTIONNAIRE: Question[] = [
  {
    id: "q-governance",
    text: "How mature is your data governance program (policies, roles, accountability)?",
    dimension: "data-governance",
    weight: 1.5,
    options: OPTIONS,
  },
  {
    id: "q-architecture",
    text: "How well-defined is your enterprise data architecture?",
    dimension: "data-architecture",
    weight: 1.0,
    options: OPTIONS,
  },
  {
    id: "q-quality",
    text: "How do you measure and manage data quality?",
    dimension: "data-quality",
    weight: 1.5,
    options: OPTIONS,
  },
  {
    id: "q-modeling",
    text: "How mature are your data modeling and design practices?",
    dimension: "data-modeling",
    weight: 0.8,
    options: OPTIONS,
  },
  {
    id: "q-storage",
    text: "How mature is your data storage and operations infrastructure?",
    dimension: "data-storage-operations",
    weight: 0.8,
    options: OPTIONS,
  },
  {
    id: "q-security",
    text: "How mature are your data security and access controls?",
    dimension: "data-security",
    weight: 1.2,
    options: OPTIONS,
  },
  {
    id: "q-integration",
    text: "How well do you integrate data across systems and sources?",
    dimension: "data-integration",
    weight: 1.0,
    options: OPTIONS,
  },
  {
    id: "q-analytics",
    text: "How mature is your use of data for analytics and decision-making?",
    dimension: "data-analytics",
    weight: 1.2,
    options: OPTIONS,
  },
  {
    id: "q-metadata",
    text: "How well do you manage metadata (data about your data)?",
    dimension: "metadata",
    weight: 0.5,
    options: OPTIONS,
  },
  {
    id: "q-master-data",
    text: "How mature is your reference and master data management?",
    dimension: "reference-master-data",
    weight: 0.5,
    options: OPTIONS,
  },
];

export function getQuestion(id: string): Question | undefined {
  return QUESTIONNAIRE.find((q) => q.id === id);
}
