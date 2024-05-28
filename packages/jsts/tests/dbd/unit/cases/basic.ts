import { runTest } from '../test';

runTest(
  'basic',
  `
let foo = null;

foo.bar;
`,
);
