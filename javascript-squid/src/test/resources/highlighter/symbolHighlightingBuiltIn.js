function builtIn(){  // create 1
  console.log(arguments)  // create 2
  arguments[0];  // reference 1
  arguments.length;// reference 2
}

eval("");  // create 3

var eval = 5; // reference 3