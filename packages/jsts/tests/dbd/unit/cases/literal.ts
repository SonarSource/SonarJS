import { runTest } from '../test';

runTest(
  'literal',
  `
const bar = {
  foo: undefined
}

{
  const x = () => {
    bar.foo.x;
    undefined.x;
  }
  
  x();
}
`,
);
