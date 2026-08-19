export class HarnessError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ValidationError extends HarnessError {
  readonly issues: string[];

  constructor(issues: string[], options?: ErrorOptions) {
    super(`Validation failed: ${issues.join("; ")}`, options);
    this.issues = issues;
  }
}

export class ProviderError extends HarnessError {
  readonly status?: number;

  constructor(message: string, status?: number, options?: ErrorOptions) {
    super(message, options);
    this.status = status;
  }
}

export class ReportError extends HarnessError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}
