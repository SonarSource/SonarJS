import { runTest } from '../test';

runTest(
  'if-only',
  `let x = 1 + 2;

if (x > 0) {
    x = null;
}

x.toString`,
);
