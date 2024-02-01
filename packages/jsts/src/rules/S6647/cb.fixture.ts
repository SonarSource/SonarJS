class Foo {
  private constructor() {
    // this is ok
  }
}

class Bar {
  constructor() { // Noncompliant
  }
}

class SuperClass {
  protected constructor() {
  }
}

class SubClass extends SuperClass {
  public constructor() {
    super();
  }
}

@Decorator()
class Decorated {
  constructor() {}
}

class Alpha {
  protected constructor() {}
}

class Beta extends Alpha {
  constructor() {
    super();
  }
}
