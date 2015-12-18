function sayHello() {
  var a = typeof (37); // Noncompliant {{The parentheses around "37" are useless.}}
  var b = typeof 38;

  var c = {};
  c.a = a;
  c.b = b;
  delete (a);  // Noncompliant {{The parentheses around "a" are useless.}}
  delete b;

  void 0;
  void (1); // Noncompliant {{The parentheses around "1" are useless.}}

  if (false) {
    return (1); // Noncompliant {{The parentheses around "1" are useless.}}
  } else {
    return 2;
  }

  try {
    throw new Error('myException');
  } catch (err) {
    throw (new Error('myExceptionTwo')); // Noncompliant {{The parentheses around "new Error('myExceptionTwo')" are useless.}}
  }

  var e = new (Error('error')); // Noncompliant {{The parentheses around "Error('error')" are useless.}}
  var error = new Error('errorTwo');

  var name, object;
  for (name in (object)) { // Noncompliant {{The parentheses around "object" are useless.}}
  }
  for (name in object) {
  }

  foo = (1 + 2);

  v in (array1 || array2); // OK
}

function* testYield(){
  var index = 0;
  while (true) {
    yield (index++); // Noncompliant
  }

  yield index;  // OK
}

new A();            // OK

new (a || b);      // OK

if (typeof (key = obj.$$hashKey) == 'function') {}   // OK
if (typeof (key += obj.$$hashKey) == 'function') {}   // OK
if (typeof (key + 'str') == 'string') {}   // OK
if (typeof (x ? y : z) == 'string') {}   // OK

