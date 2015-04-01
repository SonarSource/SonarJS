function sayHello() {
  var a = typeof (37); // NOK
  var b = typeof 38;

  var c = {};
  c.a = a;
  c.b = b;
  delete (a);
  delete b;

  void 0;
  void (1); // NOK

  if (false) {
    return (1); // NOK
  } else {
    return 2;
  }

  try {
    throw new Error('myException');
  } catch (err) {
    throw (new Error('myExceptionTwo')); // NOK
  }

  var e = new (Error('error')); // NOK
  var error = new Error('errorTwo');

  var name, object;
  for (name in (object)) { // NOK
  }
  for (name in object) {
  }

  foo = (1 + 2);

  v in (array1 || array2); // OK
}

new A();            // OK

new (a || b);      // OK
