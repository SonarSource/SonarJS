function sayHello() {
  var a = typeof (37); // Noncompliant {{Remove those useless parentheses.}}
//               ^^^^
  var b = typeof 38;

  var c = {};
  c.a = a;
  c.b = b;
  delete (a);  // Noncompliant {{Remove those useless parentheses.}}
//       ^^^
  delete b;

  void 0;
  void (1); // Noncompliant {{Remove those useless parentheses.}}

  if (false) {
    return (1); // Noncompliant {{Remove those useless parentheses.}}
  } else {
    return 2;
  }

  try {
    throw new Error('myException');
  } catch (err) {
    throw (new Error('myExceptionTwo')); // Noncompliant {{Remove those useless parentheses.}}
  }

  var e = new (Error('error')); // Noncompliant {{Remove those useless parentheses.}}
  var error = new Error('errorTwo');

  var name, object;
  for (name in (object)) { // Noncompliant {{Remove those useless parentheses.}}
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

function * foo() {

  yield (    // OK
    a + b)

  return (    // OK
    a + b)

  throw (    // OK
    a + b)

}
