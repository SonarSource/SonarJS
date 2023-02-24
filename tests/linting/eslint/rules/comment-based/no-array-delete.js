function compliant() {
  let a;
  delete a.arr[1] // OK, a.arr could be object

  function foo(arr) {
    delete arr[1] // OK, arr's type is not known, could be object, deleting property of object is allowed
  }

  var obj = { 1: "b" };
  delete obj[1]; // OK, obj is object

  let arr = ['a', 'b', 'c', 'd'];
  delete arr.length; // OK, member access, not array-like access
}

function non_compliant() {
  let arr1 = ['a', 'b', 'c', 'd'];
  delete arr1[1]; // Noncompliant {{Remove this use of "delete".}}
//^^^^^^

  let arr2 = ['a', 'b', 'c', 'd'];
  delete arr2[i]; // Noncompliant
//^^^^^^

  let arr3 = ['a', 'b', 'c', 'd'];
  if (true) {
    delete arr3[1]; // Noncompliant
  //^^^^^^
  }

  let obj = { a: { b: { c: ['a', 'b', 'c', 'd'] }} }
  delete obj.a.b.c[1]; // Noncompliant
//^^^^^^

  function arr4() { return ['a', 'b', 'c', 'd']; }
  delete arr4()[1]; // Noncompliant
//^^^^^^
}
