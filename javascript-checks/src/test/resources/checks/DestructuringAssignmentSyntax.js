function foo(obj1, obj2, arr1, arr2) {
var a = obj1.a, b = obj1.b;   // Noncompliant

foo();

var c = obj1.c;     // Noncompliant  [[secondary=+1]] {{Use destructuring syntax for these assignments from "obj1".}}
var d = obj1.d;

foo();

var e = obj1.e;     // OK, different objects
var d = obj2.d;

foo();

var f = obj1.f;     // OK, different declarations
const g = obj1.g;

foo();

var {a1, b2} = obj1;

foo();

var k = obj1.k;   // OK, just one

foo();

var n = obj1.n;     // Noncompliant  [[secondary=+1,+1]]
var m = obj1.m, l = obj1.l;

foo();

let one = arr1[0], two = arr1[1];  // Noncompliant

foo();

let one4 = arr1[0], two4 = arr1[100];  // OK

foo();

const one1 = arr1[0];   // Noncompliant  [[secondary=+1,+2]]  {{Use destructuring syntax for these assignments from "arr1".}}
const two1 = arr1[1];
const three1 = arr1[2];

foo();

let one2 = arr1[0], two2 = arr2[1];  // OK

foo();

var [one3, two3] = arr1;

foo();

var x = obj1.prop.x, y = obj1.prop.y; // Noncompliant  {{Use destructuring syntax for these assignments from "obj1.prop".}}

foo();

var t, r;
t = obj1.t;  // OK, destructuring can appear in declaration only
r = obj1.r;

}

// global scope
var obj = foo();
var a = obj.a, b = obj.b; // Noncompliant


// switch cases
switch (a) {
  case 1:
    var x = obj.x;  // Noncompliant
    var y = obj.y;
    break;
  default:
    var c = obj.c, d = obj.d; // Noncompliant
}
