function throwError(message: string): never {
  throw new Error(message);
}

export function formatDateOrThrow(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  throwError('Invalid date');
}
