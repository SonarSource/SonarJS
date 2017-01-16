var a = condition ? 1 : 2;                       // OK

// nested on the true side
var a = condition ? (condition2 ? 1 : 2) : 2;    // Noncompliant {{Extract this nested ternary operation into an independent statement.}}
//                   ^^^^^^^^^^^^^^^^^^

// nested on the false side
var a = condition ? 1 : (condition2 ? 1 : 2);    // Noncompliant
//                       ^^^^^^^^^^^^^^^^^^

// nested on both sides
var a = condition 
  ? (condition2 ? 1 : 2)                         // Noncompliant 
//   ^^^^^^^^^^^^^^^^^^
  : (condition3 ? 1 : 2);                        // Noncompliant
//   ^^^^^^^^^^^^^^^^^^ 

// nested and re-nested
var a = condition
  ? 1
  : (condition2                                  // Noncompliant
      ? 1
      : (condition3 ? 1 : 2));                   // Noncompliant

var a = condition
  ? 1
  : foo("hello", condition2 ? 1 : 2);            // Noncompliant

var foo = condition
  ? bar
  : function() {
      function g() {
        return condition2 ? 1 : 2                // OK, nesting is broken by function declaration
      }
      return g;
  }
  
var a = condition
  ? 1
  : (function() {
    return condition2 ? 1 : 2;                   // OK, nesting is broken by function expression
  })();

var foo = condition
  ? bar
  : (x => condition2 ? 1 : 2);                   // OK, nesting is broken by arrow function

var foo = condition
  ? bar
  : function* gen() {
    yield condition2 ? 1 : 2                     // OK, nesting is broken by generator
  }

var obj = condition
  ? {
    a: 1,
    b: 2
  }
  : {
    a: 1,
    b: condition2 ? 1 : 2                        // OK, nesting is broken by object literal
  }

var arr = condition
  ? [1, 2]
  : [1, condition2 ? 1 : 2]                      // OK, nesting is broken by array literal
