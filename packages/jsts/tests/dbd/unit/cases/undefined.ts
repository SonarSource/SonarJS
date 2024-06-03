import { runTest } from '../test';

runTest(
  'undefined',
  `undefined;
{
  const undefined = 5;
  undefined.toString;
}
undefined.toString;
`,
);
