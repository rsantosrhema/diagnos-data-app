export type MaturityLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type DimensionId =
  | "data-governance"
  | "data-architecture"
  | "data-quality"
  | "data-modeling"
  | "data-storage-operations"
  | "data-security"
  | "data-integration"
  | "data-analytics"
  | "metadata"
  | "reference-master-data";

export interface Dimension {
  id: DimensionId;
  name: string;
  description: string;
}

export interface Question {
  id: string;
  text: string;
  dimension: DimensionId;
  weight: number;
  options: QuestionOption[];
}

export interface QuestionOption {
  value: number;
  label: string;
  description?: string;
}

export interface Answer {
  questionId: string;
  optionValue: number;
}

export interface CompanyContext {
  name: string;
  industry?: string;
  size?: string;
  notes?: string;
}

export interface DiagnosticInput {
  company: CompanyContext;
  answers: Answer[];
}

export interface DimensionScore {
  dimension: DimensionId;
  score: number;
  level: MaturityLevel;
  weight: number;
}

export interface MaturitySummary {
  overallScore: number;
  overallLevel: MaturityLevel;
  levelLabel: string;
  dimensionScores: DimensionScore[];
}

export interface NarrativeAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface ChartDatum {
  dimension: string;
  score: number;
}

export interface DiagnosticResult {
  company: CompanyContext;
  maturity: MaturitySummary;
  narrative: NarrativeAnalysis;
  charts: {
    radar: ChartDatum[];
    bar: ChartDatum[];
  };
  report: {
    pdf: Buffer;
    filename: string;
  };
}
