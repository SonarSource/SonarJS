function userDefined() {
  foo();                                              // OK, unknown function

  function bar() { return true;}
  bar();                                              // FN, this rule is only about built-in functions
  cond = bar();                                       // OK
}

function builtIn_Array() {
  let arr = new Array(1, 2);

  arr.indexOf(1);                                     // Noncompliant {{The return value of "indexOf" must be used.}}
  let i = arr.indexOf(1);                             // OK
  [1, 2, 3].indexOf(3);                               // Noncompliant {{The return value of "indexOf" must be used.}}

  arr.forEach(func);                                  // OK

  arr.sort();                                         // OK
  const arr2 = new Array().sort();                    // OK
  [1, 2, 3].sort();                                   // OK

  const cond = Array.isArray([1, 2, 3]);              // OK
  Array.isArray([1, 2, 3]);                           // Noncompliant {{The return value of "isArray" must be used.}}
}

function builtIn_Date() {
  let d = new Date();
  d.setYear(1967);                                    // OK
  d.getYear();                                        // Noncompliant

  Date.now();                                         // Noncompliant
}

function builtIn_Function() {
  const f = new Function('i', 'return i + i');
  f.apply(12);                                        // OK
  f.bind(12);                                         // Noncompliant
  f.call(12);                                         // OK
  f.toString();                                       // Noncompliant
}

function builtIn_Math() {
  Math.sin(0.);                                       // Noncompliant
}

function builtIn_Number() {
  new Number(1).valueOf();                            // Noncompliant

  Number.isNaN(x);                                    // Noncompliant
}

function builtIn_Object() {
  new Object().seal();                                // OK
  new Object().hasOwnProperty("name");                // Noncompliant
  
  Object.freeze(new Object());                        // OK
  Object.create(null);                                // Noncompliant
}

function builtIn_Regexp() {
  new RegExp("foo", "gi").compile("new foo", "g");    // OK
  new RegExp("foo", "gi").test("new foo");            // Noncompliant
}

function builtIn_String() {
  new String("hello").charAt(3);                      // Noncompliant
  "hello".charAt(3);                                  // Noncompliant
  const c = "hello".charAt(3);                        // OK
  
  s.length;                                           // OK, "length" is a property, not a method 
}

function builtIn_global() {
  isNaN(x);                                           // Noncompliant {{The return value of "isNaN" must be used.}}
  const cond = isNaN(x);                              // OK
}

function builtIn_inherited() {
  new Array(10, 20).isPrototypeOf("hello");           // Noncompliant
}

function builtIn_withUselessParentheses() {
  ((Math.sin))(0);                                    // Noncompliant {{The return value of "sin" must be used.}}
}

function builtIn_arrayLiteral() {
  [Math.sin(0), Math.cos(0)];                         // OK
  const arr = [Math.sin(0), Math.cos(0)];             // OK
}

function builtIn_arrayDestructuring() {
  const [a] = [Math.sin(0)];                          // OK
  const [, b] = [Math.sin(0), Math.cos(0)];           // FN
  const [a, ...rest] = [Math.sin(0) , Math.cos(0)];   // FN
}

function builtIn_misc() {
  f = function() { return Math.random() };            // OK
  
  const cond = isNaN("hello".charAt(1));              // OK
  isNaN("hello".charAt(1));                           // Noncompliant {{The return value of "isNaN" must be used.}}
}

function builtIn_OneIssueAtMost(cond) {
  let s = "hello";
  if (cond) {
    s = "world";
  }
  s.charAt(1, 2);                                     // Noncompliant (1 issue here, not 2)
  foo(cond);                                          // to keep cond alive and thus force 2 execution paths
}

function ok_if_callback_with_possible_side_effect() {
  var foo = 0;
  var arr = [];
  arr.map(function(el) {  // OK, foo might be changed
    bar(foo, el);
  });

  arr.map(function noSideEffects() { return 2; });    // Noncompliant
}
