function fun(x) {
  print(x); // OK
}

print(x); // NOK
var x = 1;

function fun() {
  print(y); // NOK
}
var y = 1;
