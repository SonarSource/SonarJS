import { runTest } from '../test';

runTest(
  'if',
  `
let x = 1;

if (true) {
}

if (x) {
}

if (0) {
}

if (x > 1) {
}
`,
);
