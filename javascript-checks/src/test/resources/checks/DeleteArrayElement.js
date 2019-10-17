var arr = ['a', 'b', 'c', 'd'];
var i = 1;
  delete arr[1]; // Noncompliant {{Remove this use of "delete".}}
//^^^^^^
delete arr[i]; // Noncompliant
delete arr // OK

if (condition) {
  delete arr[1] // Noncompliant
}

function foo(arr) {
  delete arr[1] // OK, arr's type is not known, could be object, deleting property of object is allowed
}

arr.splice(2, 1); // OK

delete a.arr[1] // OK, a.arr could be object

var obj = { 1: "b"};

delete obj[1];  // OK, obj is object


function fooo(unknown){
  delete unknown[i] // OK, we are not sure what type of unknown, as it could come from smthUnknown
}

fooo([1])
fooo(smthUnknown)
