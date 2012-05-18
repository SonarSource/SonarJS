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
      continue;
    }

    if (true)
      break;

    if (true)
      continue;
  }

  switch (a) {
  case 1: {
    break;
    var e; // NOK
  }
  case 2:
    break;
  case 3:
    break;
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
    return;
  else
    return;

  var n; // NOK - both if branches returns, so this is also unreachable

}