import { runTest } from '../test';

const code = `function foo(x, y) {
  return y.toString;
}

foo(5,6);
foo(5); // Raised issue on Rule: functions(6:0 - 6:6)
foo(); // Raised issue on Rule: functions(7:0 - 7:5);`;

runTest('function-declaration.js', code);
