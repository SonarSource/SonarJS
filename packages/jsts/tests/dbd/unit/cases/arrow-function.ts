import { runTest } from '../test';

runTest(
  'arrow-function',
  `
const foo = null;
const bar = () => {
  foo.zzz;
}
oof;
foo;
bar();
`,
);
