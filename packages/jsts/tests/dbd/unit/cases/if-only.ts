import { runTest } from '../test';

runTest(
  'if-only',
  `
let x = 1;

if (x > 0) {
    x = null;
}

x.toString`,
);
