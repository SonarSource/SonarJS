function fun() {
  x = 1; // NOK
  x = 2;
  var y = 3; // OK
}

for (z in obj){}  // NOK

for (j = 0; j < array.length; j++){} // NOK

for (k of obj){}  // NOK

function fun(){
  z = 1;   // OK
  var z;
  var var1 = var2 = 1;  // NOK
  fun(arguments) // OK
}

