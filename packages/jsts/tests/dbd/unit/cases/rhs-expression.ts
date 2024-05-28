import { runTest } from '../test';

runTest(
  'rhs-expression',
  `
let foo = 5 + 6 * 7 - 8 / 2;
let bar = 5 + foo
`,
);
