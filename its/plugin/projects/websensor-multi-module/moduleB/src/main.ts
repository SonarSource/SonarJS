import { CONSTANT } from "shared/constant";

export function isSmaller(value: string) {
  return value < CONSTANT; // Noncompliant: S3003
}
