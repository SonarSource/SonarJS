// S2933: prefer-readonly — member is never reassigned, mark as readonly
class MyClass {
  private name: string; // Noncompliant

  constructor(name: string) {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }
}
