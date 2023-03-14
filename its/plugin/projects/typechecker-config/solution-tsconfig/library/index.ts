import { CONSTANT } from 'library/lib';

export function foo(value: string) {
  return value < CONSTANT; // Noncompliant: S3003
}
