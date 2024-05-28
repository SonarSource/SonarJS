import { runTest } from '../test';

runTest(
  'declaration',
  `
let foo;
let bar = 5;
let x, y = 5;
let [a] = [5];
let foo = NaN;
`,
);
