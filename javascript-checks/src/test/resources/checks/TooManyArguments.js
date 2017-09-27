function foo1(p1, p2){}

foo1(1, 2, 3);  // Noncompliant [[sc=5;ec=14;el=+0;secondary=-2]] {{"foo1" declared at line 1 expects 2 arguments, but 3 were provided.}}

function foo2(){
  foo1(1, 2, 3, 4);  // Noncompliant {{"foo1" declared at line 1 expects 2 arguments, but 4 were provided.}}
  foo1(1, 2);
  foo1(1);

  var foo3 = function(){}

  foo3(1)  // Noncompliant {{"foo3" declared at line 10 expects 0 arguments, but 1 was provided.}}
}

function foo4(){
  console.log(arguments)
}

foo4(1, 2) // OK, "arguments" is used

var obj = {
  foo1 : function(p1, p2){}
}

obj.foo1(1, 2, 3) // Compliant - False Negative - object properties are not covered yet



//  ELLIPSIS (Rest Parameter)

function foo5(par1, ... par2){}

foo5(1, 2, 3, 4)  // OK


 var foo6 = function(...p1){}
 foo6(1, 2) // OK


// parameter with "arguments" name

function foo7(arguments){
  console.log(arguments)
}

foo7(1, 2); // Noncompliant {{"foo7" declared at line 42 expects 1 argument, but 2 were provided.}}

(function(p1, p2){
  doSomething1();
  doSomething2();
})(1, 2, 3);     // Noncompliant

x=function(a,b){
  return a + b;
}(1,2,3);       // Noncompliant

var arrow_function = (a, b) => {};
arrow_function(1, 2, 3); // Noncompliant


function builtIn_GlobalFunction() {
  isNaN();                                  // OK, too few arguments
  isNaN(obj);                               // OK
  isNaN(obj, true);                         // Noncompliant {{"isNaN" expects 1 argument, but 2 were provided.}}
}

function builtIn_StringFunctions() {
  "hello".charAt();                         // OK, too few arguments
  "hello".charAt(1);                        // OK
  "hello".charAt(1, 2, 3);                  // Noncompliant {{"charAt" expects 1 argument, but 3 were provided.}}
  new String("hello").charAt(1, 2, 3);      // Noncompliant
}

function builtIn_FunctionWithNoParams() {
  new Array(1, 2).reverse();                // OK
  new Array(1, 2).reverse(a, b, c);         // Noncompliant {{"reverse" expects 0 arguments, but 3 were provided.}}
}

function builtIn_FunctionWithRestParams() {
  Array.of();                               // OK
  Array.of(1, 2, 3, 4);                     // OK
}

function builtIn_WithUselessParentheses() {
  (isNaN)(obj, true);                       // Noncompliant {{"isNaN" expects 1 argument, but 2 were provided.}}
}

function builtIn_ReferenceToBuiltIn() {
  var isNaN2 = isNaN;
  isNaN2(obj, true);                        // Noncompliant {{"isNaN2" expects 1 argument, but 2 were provided.}}  // no secondary location, unfortunately
}

function builtIn_IgnoredSpecificCases() {
  new Buffer().toString('base64');          // OK, specifically ignored Object function
  new Buffer().toLocaleString('base64');    // OK, specifically ignored Object function
  new Buffer().hasOwnProperty(a, b);        // Noncompliant, not ignored Object function
  new Buffer().hello(a, b);                 // OK, not an Object function
}

function builtIn_OneIssueAtMost(cond) {
  var s = "hello";
  if (cond) {
    s = "world";
  }
  s.charAt(1, 2);                           // Noncompliant (1 issue here, not 2)
  foo(cond);                                // to keep cond alive and thus force 2 execution paths
}

function builtIn_OnePathRaisesIssue(cond) {
  var s = unknown();
  if (cond) {
    s = "world";
  }
  s.charAt(1, 2);                           // Noncompliant (s is a string on one path, s is unknown on the other path)
  foo(cond);                                // to keep cond alive and thus force 2 execution paths
}

function builtIn_from_ember() {
  "foo".camelize(1, 2);                    // OK, we don't consider not standard built-in methods
}

isNaN(obj, true);                           // FN, too many arguments but symbolic execution doesn't check global scope 

class A {

  get a() {
    return someFunc;
  }

  foo(param) {
    this.a(param); // OK, it's a property with getter
  }
}
