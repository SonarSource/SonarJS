function sayHello() {
  var a = typeof (37); // Noncompliant {{Remove useless parentheses around "37".}}
//               ^^^^
  var b = typeof 38;

  var c = {};
  c.a = a;
  c.b = b;
  delete (a);  // Noncompliant {{Remove useless parentheses around "a".}}
//       ^^^
  delete b;

  void 0;
  void (1); // Noncompliant {{Remove useless parentheses around "1".}}

  if (false) {
    return (1); // Noncompliant {{Remove useless parentheses around "1".}}
  } else {
    return 2;
  }

  try {
    throw new Error('myException');
  } catch (err) {
    throw (new Error('myExceptionTwo')); // Noncompliant {{Remove useless parentheses around "new Error('myExceptionTwo')".}}
  }

  var e = new (Error('error')); // Noncompliant {{Remove useless parentheses around "Error('error')".}}
  var error = new Error('errorTwo');

  var name, object;
  for (name in (object)) { // Noncompliant {{Remove useless parentheses around "object".}}
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

function foo() {

  yield (    // OK
    a + b)

  return (    // OK
    a + b)

  throw (    // OK
    a + b)

}
