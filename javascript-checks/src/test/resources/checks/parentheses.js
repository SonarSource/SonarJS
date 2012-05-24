function sayHello() {
  var a = typeof (37);
  var b = typeof 38;

  var c = {};
  c.a = a;
  c.b = b;
  delete (a);
  delete b;

  void 0;
  void (1);

  if (false) {
    return (1);
  } else {
    return 2;
  }

  try {
    throw new Error('myException');
  } catch (err) {
    throw (new Error('myExceptionTwo'));
  }

  var e = new (Error('error'));
  var error = new Error('errorTwo');

  var name, object;
  for (name in (object)) {
  }
  for (name in object) {
  }
}