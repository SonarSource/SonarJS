import { runTest } from '../test';

// a reference is scope.identifier
// an assignment is scope.identifier = value

runTest(
  'identifier',
  ` // scope #0
const foo = 5;
{
  const bar = 5;
  {
    foo;
    bar;
  }
  foo.x;
}
bar.x;
`,
);
