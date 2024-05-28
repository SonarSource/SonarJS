import { runTest } from '../test';

runTest(
  'dbd-meeting',
  `
let x = 5 * bar();
{
  let foo = 5;
}
foo.bar;
`,
);
