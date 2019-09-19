interface TypeDeclaredElsewhere {
  someMethod(): number;
  new(b: boolean): TypeDeclaredElsewhere; // Noncompliant
  constructor(b: boolean): void; // Noncompliant
}
