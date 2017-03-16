function sayHello(y) {
  var x = new Boolean(y); // Noncompliant {{Use a literal value for this.}}
//        ^^^^^^^^^^^^^^

  x = new Number; // Noncompliant
  x = new Number(y); // Noncompliant
  x = new Number(true); // Noncompliant

  x = new String(y); // Noncompliant
  x = new String(42); // Noncompliant
  x = new String(); // Noncompliant
  x = new String("str", 42); // Noncompliant

  // not primitive wrapper constructors
  x = new Array();
  x = new MyObject();
  x = new Foo.MyObject();
  x = new MyObject;

  // OK with literals of the same type
  x = new Boolean(true);
  x = new Boolean(false);
  x = new String("");
  x = new Number(0);

  // OK without "new"
  x = Boolean(y);
  x = Number(y);
  x = String(y);
}
