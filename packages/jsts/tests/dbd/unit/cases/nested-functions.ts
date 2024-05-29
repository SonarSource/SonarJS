import { runTest } from '../test';

const code = `const foo = (x, y) => {
  const bar = (x) => {
    x.toString;
  };
  
  bar(y);
};

foo(5,6);
foo(5); // Raised issue on Rule: functions(10:0 - 10:6)
foo(); // Raised issue on Rule: functions(11:0 - 11:5)`;

runTest('nested-functions', code);
