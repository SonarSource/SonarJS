class A1 {
  constructor() {
    // no super()            // OK
  }
}

class B1a extends A1 {
  constructor() {
    super();                 // OK
    super.x = 1;
  }
}

var B1b = class extends A1 {
  constructor() {
    super();                 // OK
    super.x = 1;
  }
}

class A2 {
  constructor() {
    super();                 // This is a syntax error

    this.f = function() {
      super();               // FN
    }
    this.g = (function() {
      super();               // FN
    })(1)
  }
  bar() {
    super();                 // FN
  }
}

class B2a extends A2 {
  constructor() {
    super();                 // OK
    this.f = function() {
      super();               // FN
    }
  }
}

var B2b = class extends A2 {
  constructor() {
    super();                 // OK
    this.f = function() {
      super();               // FN
    }
  }
}

class A3 extends Unknown {
  constructor() {
    super(x);                // OK
  }
  bar() {
    super(x);                // Noncompliant {{super() can only be invoked in a derived class constructor.}}
  }
}

class A4 extends Unknown {
  constructor() {
    super(x);                // OK
  }
}

class A5 extends null {
  constructor() {
    super();                 // NOK, but no solution: super() -> TypeError, whereas no super() -> ReferenceError
  }
}

class A6 extends null {
  constructor() {
    // no super()            // NOK, but no solution: super() -> TypeError, whereas no super() -> ReferenceError
  }
}

function foo() {
  super();                   // Noncompliant {{super() can only be invoked in a derived class constructor.}}
}

function constructor() {
  super();                   // Noncompliant {{super() can only be invoked in a derived class constructor.}}
}

super();                     // Noncompliant {{super() can only be invoked in a derived class constructor.}}

//-------------------------------------------------------------------------------------------------

class A10 {
}

class B10 extends A10 {
  constructor() {            // Noncompliant {{super() must be invoked in any derived class constructor.}}
//^^^^^^^^^^^
    // no super()
  }
}

class B11 extends Unknown {
  constructor() {            // Noncompliant {{super() must be invoked in any derived class constructor.}}
    // no super()
  }
}

//-------------------------------------------------------------------------------------------------

class A20 {
  constructor(x) {
    this.x = x;
    this.foo();
  }
  foo() {}
}

class B20a extends A20 {
  constructor(x, y) {
    bar();
    super(x);                // OK
    this.y = y;
    super.x = x + y;
    this.foo();
    super.foo();
  }
}

class B20b extends A20 {
  constructor(x, y) {
    this.y = y;
//S ^^^^                     ID1
    super.x = x + y;
//S ^^^^^                    ID1
    this.foo();
//S ^^^^                     ID1
    bar(this);
//S     ^^^^                 ID1
    bar(super.x);
//S     ^^^^^                ID1
    super(x);                // Noncompliant [[ID=ID1]] {{super() must be invoked before "this" or "super" can be used.}}
//  ^^^^^
    super.foo();
  }
}

class B20c extends A20 {
  constructor(x, y) {
    this.foo(
//S ^^^^                     ID2
        super(x));           // Noncompliant [[ID=ID2]] {{super() must be invoked before "this" or "super" can be used.}}
//      ^^^^^
  }
}

class B20d extends A20 {
  constructor(x, y) {
    super(x); this.y = y;    // OK
  }
}

class B20e extends A20 {
  constructor(x, y) {
    // on the same line
    this.y = y; super(x);    // Noncompliant [[secondary=+0]] {{super() must be invoked before "this" or "super" can be used.}}
  }
}

//-------------------------------------------------------------------------------------------------

class A30 {
  constructor() {}
}

class B30 extends A30 {
  constructor(x) {
    super();                 // OK
  }
}

class C30 extends B30 {
  constructor(x, y) {
    super(x);                // OK
  }
}

class B30b extends A30 {
  constructor(x) {
    super(x);                // Noncompliant {{super() must be invoked with 0 arguments.}}
  }
}

class B30c extends A30 {
  constructor(x) {
    super(x, y);             // Noncompliant {{super() must be invoked with 0 arguments.}}
  }
}

class A32 {
    constructor(x, y, z) {}
//S            ^^^^^^^^^ 32
}

class B32 extends A32 {
  constructor() {
    super(x, y);             // Noncompliant [[ID=32]] {{super() must be invoked with 3 arguments.}}
//  ^^^^^^^^^^^
  }
}

class A33 {
  constructor(x, y, z) {}
}

function f35() {
  class A35 {
    constructor(x) {}
  }

  class B35a extends A35() {
    constructor(x) {
      super(x);              // OK
    }
  }

  class B35b extends A35 {
    constructor(x,y) {
      super(x, y);           // Noncompliant {{super() must be invoked with 1 argument.}}
    }
  }

  class D34a extends A33 {
    constructor(x) {
      super(x);              // Noncompliant {{super() must be invoked with 3 arguments.}}
    }
  }

  class D34b extends B32 {
    constructor(x) {
      super(x, y);           // Noncompliant {{super() must be invoked with 0 arguments.}}
    }
  }
}

function f36() {
  class A36 {
    constructor(x) {}
  }
}

function g36() {
  class B36a extends A36 {
    constructor() {
      super(x, y, z);        // OK, unknown base class A36 (not the class A36 above, which is in another scope)
    }
  }

  class B36b extends Unknown {
    constructor() {
      super(x, y, z);        // OK
    }
  }
}

class A37 {
  // no constructor
}

class B37 extends A37 {
  constructor() {
    super();                 // OK
  }
}

var A38 = 10;

class B38 extends A38 {      // Meaningless, but this is irrelevant to this rule
  constructor() {
    super(x);                // OK
  }
}

//-------------------------------------------------------------------------------------------------

class A40 {
}

class B40 extends A40 {
  constructor() {
    super();
    super();                 // Noncompliant [[secondary=-1]] {{super() can only be invoked once.}}
    super();                 // Noncompliant [[secondary=-2]] {{super() can only be invoked once.}}
  }
}

class B41 extends A40 {

  constructor() {
    super();
  }

  createObject() {
    var obj = {
      constructor() {       // OK
      }
    }
    return obj;
  }

  passObject() {
    innerFunction({
      constructor() {       // OK
      }
    });
  }

  nesting() {
    function constructor() {  // OK
    }
  }

  delayedConstructorCreation() {
    var obj = {};
    obj.constructor = function() {  // OK

    };
    var obj2 = {};
    obj.constructor = function() {
      super();  // Noncompliant
    }
  }

  constructorInArray() {
    var array = [{
      constructor() {   // OK
      }
    }];
  }
}

var top_level_object = {
  constructor() {         // OK
    super();              // FN
  }
}


class Foo {
    constructor(name, options = {}) {
        this.name = name;
        this.options = Object.assign({}, defaultOptions, options);
    }
}

class Bar extends Foo {
    constructor(...args) {
        super(...args);
    }
}
class Baz extends Foo {
    constructor() {
        super("blah");
    }
}

class Super {
  constructor(arg1, arg2, arg3 = 1, arg4 = 0) {}
}

class Derived1 extends Super {
  constructor() {
    super(1); // Noncompliant
  }
}

class Derived2 extends Super {
  constructor() {
    super(1, 2);
  }
}

class Derived3 extends Super {
  constructor() {
    super(1, 2, 3);
  }
}

class Derived4 extends Super {
    constructor() {
        super(1, 2, 3, 4);
    }
}

class Derived5 extends Super {
    constructor() {
        super(1, 2, 3, 4, 5); // FN
    }
}

class Derived6 extends Super {
    constructor(args) {
        super(...args);
    }
}
