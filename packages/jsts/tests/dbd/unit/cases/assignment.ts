import { runTest } from '../test';

runTest(
  'assignment',
  `
let foo = 5;
let bar = {};

bar.foo.oof = foo;
`,
);

/**
 *           "#15 = call #get-field# foo(#10)", // !!!
 *           "#16 = call #get-field# bar(#10)", // !!!
 *           "#17 = call #get-field# foo(#16)", // !!!
 *           "#18 = call #set-field# oof(#17,#15)", // !!!
 */
