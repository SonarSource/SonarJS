import { runTest } from '../test';

runTest(
  'undefined',
  `function foo(x) {
  x.bar;
}

let undefined = 5;

foo(undefined);`,
);
