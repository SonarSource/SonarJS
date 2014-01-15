function sayHello() {
  return;
  var a; // NOK

  if (true) {
    return;
    var b; // NOK
  } else {
    var c;
  }

  while (true) {
    break;
    var d; // NOK

    continue;
    var e; // NOK

    if (true) {
      break;
      /** OK and is not affected by comments */
    }

    if (true) {
      continue; // OK
    }

    if (true)
      break; // OK

    if (true)
      continue; // OK
  }

  switch (a) {
  case 1: {
    break;
    var e; // NOK
  }
  case 2:
    break; // OK
  case 3:
    break; // OK
  default:
    var g;
  }

  try {
    var h;
    throw ("MyException");
    var i; // NOK
  } catch (e) {
    var j;
    throw ("MyException");
  } finally {
    var k;
  }

  try {
    throw ("MyException");
  } catch (e) {
    var m;
  }

  if (true)
    return; // OK
  else
    return; // OK

  var n; // TODO: NOK - both if branches returns, so this is also unreachable

  return;

  function f(){ // OK
  }

}
