function main() {
  var obj = {a: 1};
  +obj;           // Noncompliant {{Remove this use of unary "+".}}
//^
  -obj;           // Noncompliant {{Remove this use of unary "-".}}
  +obj.a;   // OK

  function foo() {
    return 1;
  }

  +foo;           // Noncompliant
  -foo();    // OK

  var obj2 = new Foo();
  -obj2;          // Noncompliant

  var x = 1;
  +x;       // OK

  y = true
  +y;       // OK

  z = "string"
  -z;        // OK

  -"24";     // OK
  +1;       // OK
  -true;    // OK

  var o1 = new String("");
  var o2 = new Boolean(true);
  var o3 = new Number(1);
  +o1; // Noncompliant FP
  +o2; // Noncompliant FP
  +o3; // Noncompliant FP

  +(new Date());   // OK
  var d = new Date();
  +d;    // Noncompliant FP
  -d;    // Noncompliant
  + someDate;    // OK
  + date;    // OK

  }
