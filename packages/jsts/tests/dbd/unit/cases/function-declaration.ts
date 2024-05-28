import { runTest } from '../test';

const code = `function foo(x, y) {
  return y.toString;
}

foo(5,6);
foo(5); // Raised issue on Rule: functions(4:0 - 4:6)
foo(); // Raised issue on Rule: functions(5:0 - 5:5);`;

runTest('function-declaration.js', code);
