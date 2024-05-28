import { runTest } from '../test';

const code = `const foo = (x, y) => y.toString;

foo(5,6);
foo(5); // Raised issue on Rule: functions(4:0 - 4:6)
foo(); // Raised issue on Rule: functions(5:0 - 5:5)`;

runTest('functions', code);
