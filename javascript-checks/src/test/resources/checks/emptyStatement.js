
  ;                          // OK, leading semicolon, used in case this file is appended to another library that omits a trailing semicolon 

function one_never_knows() {
  var a = b;                 // OK
  i = g();                   // OK
  return 0 ;                 // OK
}                            // OK, no semicolon
var a = b;                   // OK
i = g();                     // OK

function basic() {
  ;                          // Noncompliant {{Remove this empty statement.}}
//^

  a + b;                     // OK
  i++;                       // OK
  "hello world";             // OK

  var i = 1
  ;                          // OK

  var i = 2;
  // Noncompliant@+3
  // Noncompliant@+2
  // Noncompliant@+1
  ;;;

  var g = function() {};     // OK
  var h = function() {};;    // Noncompliant
//                      ^

  return 0;;                 // Noncompliant
//         ^
} ;                          // Noncompliant
   ;                         // Noncompliant

// ; this is a comment containing semicolons ;;  // OK

/* ; this is a 
   multi-line comment ; 
   containing semicolons ;; */                   // OK

function if_else() {
  if (condition) {
    if (a)
      ;                      // OK, necessary semicolon if there are no curly brackets
    else if (b)
      ;                      // OK, necessary semicolon if there are no curly brackets 
    else
      ;                      // OK, necessary semicolon if there are no curly brackets

    if (a) {
      ;                      // Noncompliant
    } else if (b) {
      ;                      // Noncompliant
    } else {
      ;                      // Noncompliant
    }
  }
}

function nesting() {
  function nested() {;}      // Noncompliant
  ;                          // Noncompliant
}

function loops() {
  for (;;) {                 // OK
  }

  for (i = 0; i < arr.length; arr[i++] = 0);   // OK, necessary semicolon if there are no curly brackets

  for (i = 0; i < n; i++) {
  };                         // Noncompliant

  while (doSomething() > 0); // OK, necessary semicolon if there are no curly brackets

  while (a > 0) {
  };                         // Noncompliant

  do {
    a--;
  } while (a > 0);           // OK
}

function switches() {
  switch (foo) {
   case 0:
     break;
   case 1:
     ;                       // Noncompliant
   default:
     ;                       // Noncompliant
  };                         // Noncompliant
}

function try_catch() {
  try {
  }
  catch (e) {
  };                         // Noncompliant

  try {
  }
  finally {
  };                         // Noncompliant
}

function defensive() {
  a = b + c
  ;(d + e).foo();            // OK, defensive semicolon on a line starting with '(' or '['

  a = arr
  ;[i] = b;                  // OK, defensive semicolon on a line starting with '(' or '['
}

function immediately_invoked() {
  (function() {})();         // OK
  (function() {}());         // OK
}

function closure() {
  var add = (function () {
    var counter = 0;
    return function () {return counter += 1;}
  })();                      // OK
}

class ClassA {
};                           // Noncompliant
