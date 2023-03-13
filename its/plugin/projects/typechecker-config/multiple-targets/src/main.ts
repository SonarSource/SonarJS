import { CONSTANT } from './lib';

function foo(value: string, logger: (flag: boolean) => void) {
  logger(value < CONSTANT); // Noncompliant: S3003
}

foo('ES3', flag => console.log(flag ? 'FAILURE' : 'SUCCESS'));
