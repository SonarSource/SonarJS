var arr = ['a', 'b', 'c', 'd'];
var i = 1;
delete arr[1]; // NOK
delete arr[i]; // ??
delete arr // OK

if (condition) {
  delete arr[1] // NOK
}

function foo() {
  delete arr[1] // NOK
}

arr.splice(2, 1); // OK

delete a.arr[1] // NOK