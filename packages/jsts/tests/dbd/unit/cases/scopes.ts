import { runTest } from '../test';

runTest(
  'scopes',
  `
let foo;
let bar;
{
   {
      bar = 5;
      let foo = 5;
   }
}
bar.toString;
foo.toString;
`,
);
