function builtIn(){  // create 1
  console.log(arguments)  // create 2
  arguments[0];  // reference 1
  arguments.length;// reference 2
  this.foo();   // create 3
  foo(this);    // reference 3
}

eval("");  // create 4

var eval = 5; // reference 4

// + one creation and one reference for curly braces
