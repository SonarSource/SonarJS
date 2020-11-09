var person = {
  set name(name) {
    this.name = name;
    return 42;  // Noncompliant
  }
};
