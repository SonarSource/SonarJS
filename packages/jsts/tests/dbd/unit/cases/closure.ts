import { runTest } from '../test';

runTest(
  'closure',
  `const foo = null;

function a() {
  foo.toString;
}

a()`,
);
