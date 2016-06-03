function sayHello() {
  var x = new Boolean(false); // Noncompliant {{Use a literal value for this.}}
//        ^^^^^^^^^^^^^^^^^^
  if (x) {
    alert('hi');  // Shows 'hi'.
  }

  var x = Boolean(0); // OK
  if (x) {
    alert('hi');  // This will never be alerted.
  }

  new Number(1); // Noncompliant
  new String('2'); // Noncompliant

  new MyObject(); // OK
}
