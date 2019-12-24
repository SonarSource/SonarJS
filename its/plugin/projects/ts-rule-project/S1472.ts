function foo(k: number) {
  return k + 1;
}

const n = 5;

foo(n);

foo(
  n
);

foo
(n); // Noncompliant
