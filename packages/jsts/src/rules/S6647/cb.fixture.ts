import { Lambda } from 'lambda';

class Foo {
  private constructor() {
    // this is ok
  }
}

class Bar {
// Noncompliant@+1 [[qf2]] {{Useless constructor.}}
  constructor() {
  }

// fix@qf2 {{Remove constructor}}
// del@qf2+1
// edit@qf2 [[sc=2;ec=18]] {{}}
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

class Gamma extends Lambda {
  constructor() {
    super();
  }
}
