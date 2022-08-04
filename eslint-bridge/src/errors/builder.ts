export type ErrorType = 'Parsing' | 'General';

export function buildError(error: Error, type: ErrorType) {
  return new SonarError(error, type);
}

export class SonarError extends Error {
  type: ErrorType;
  constructor(error: Error, type: ErrorType) {
    super(error.message);
    this.type = type;
  }
}
