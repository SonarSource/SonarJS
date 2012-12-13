fun(); // prints "bar"

// first declaration of the function
function fun() {
  print("foo");
}

fun(); // prints "bar"

// redeclaration of the "fun" function: this definition overrides the previous one
function fun() { // NOK
  print("bar");
}

fun(); // prints "bar"
