import { CONSTANT } from 'lib';

function foo(value: string) {
  return value < CONSTANT; // Noncompliant: S3003
}

console.log(foo('10') ? 'SUCCESS' : 'FAILURE');
