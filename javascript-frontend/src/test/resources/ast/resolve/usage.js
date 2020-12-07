var a = 1;
b = 1; // implicit declaration

f();                         // f
new f;                       // f

doSomething(a + b);          // a, b

function f(p1, p2) {
  return a + p1.length;       // a, p1

  var b = function g() {
    if (false) return g();   // g - function expression
  }

  return new b || b();       // b, b
}

try {

} catch (e) {
  throw e;                   // e
}

eval()                      // eval - 1

function foo(){
  eval()                    // eval - 2
}

function foo(){
  var eval = function(){};
  eval()
}

// hoisting
function foo(){
  eval()
  var eval = function(){};
}

arguments = 1

var var1 = 1
var1 = 2
foo(var1)
var1++
var var1

let x;

if (true) {
  const x = 2;
}
x = 42
foo(x);

for (let y of obj) {
  y = 1;
}

for (let z in obj)
  foo(z);

var i = 10;
for(let i = i + 1; i < 20; i++) {}
var j = 10;
for (var j = j + 1; j < 20; j++) {}

if (true) {
  i2; // ReferenceError
  let i2 = 2, j2 = i2; // OK
  let x2 = x2; // ReferenceError
}

var x3;
if (condition) {
  x3;
  let x3 = 42;
}

import DefaultMember from "module-name";
import * as AllMembers from "module-name";
import {member1} from "module-name";
import {member2, member3 as member3Alias} from "module-name";
import DefaultMember1, {member4} from "module-name";

member1();
new DefaultMember();

var usedInTemplate = 42;
console.log(`\\${usedInTemplate}`);


import * as namespaceImport from "module";
var flownamespaceVar: namespaceImport.FlowType;


function foo<T>(p: T) {
  let yy: T = 42;
}

class FlowFunctionType {
  f: <P>(p: P) => P;
}
