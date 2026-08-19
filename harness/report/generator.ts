import { ReportError } from "../core/errors";
import type { DiagnosticResult } from "../core/types";

export interface ReportGenerator {
  generate(result: DiagnosticResult): Promise<{ pdf: Buffer; filename: string }>;
}

/**
 * PDF report generator.
 *
 * The PDF library is not yet installed. This stub returns a placeholder buffer
 * and documents the intended contract. When implementing, prefer a
 * server-compatible library (e.g. `pdfkit` or `@react-pdf/renderer`) and
 * record the decision in `docs/decisions/`.
 */
export class PlaceholderReportGenerator implements ReportGenerator {
  async generate(result: DiagnosticResult): Promise<{ pdf: Buffer; filename: string }> {
    const filename = `diagnostic-${result.company.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}.pdf`;

    const placeholder = Buffer.from(
      `Diagnos Data App — Data Maturity Report\nCompany: ${result.company.name}\nOverall level: ${result.maturity.levelLabel}\n\nPDF generation not yet implemented.`,
      "utf-8",
    );

    if (placeholder.length === 0) {
      throw new ReportError("Failed to generate PDF report");
    }

    return { pdf: placeholder, filename };
  }
}
