import { runTest } from '../test';

runTest(
  'closure',
  ` // #9
const foo = { // scope#11
  bar: {
    // scope#13
  },
  missing: null
};

foo.bar.getSomething = () => { 
  // #19
  return foo.missing.something;
}
// #9
foo.bar.getSomething()`,
);
