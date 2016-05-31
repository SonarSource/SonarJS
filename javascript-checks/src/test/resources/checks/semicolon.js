function sayHello() {
  var a = { // Noncompliant {{Add a semicolon at the end of this statement.}}
    'i': 1,
    'j': 2
  }

  return 1 // Noncompliant
//^^^^^^^^

  if (condition) { // OK
  }

  for (i = 0; i < 10; i++) { // OK
  }

  label: while (condition) { // OK
    break label; // OK
  }

  return 1; // OK
}

import x from 'mod'  // Noncompliant
import x from 'mod'; // OK
import 'mod'  // Noncompliant
import 'mod'; // OK

function f() {
  do {}  // Noncompliant
  while (false)
  do {} 
  while (false); // OK
  throw x  // Noncompliant
  throw x; // OK
  debugger  // Noncompliant
  debugger; // OK
  while(false) {
    continue  // Noncompliant
    continue; // OK
  }
}


export * from "moduleName"   // Noncompliant
export {a, b} from "moduleName"  // Noncompliant
export {a, b}  // Noncompliant
export var a = 1 // Noncompliant
export let a = 1 // Noncompliant
export const a = 1 // Noncompliant
export var a = function() {} // Noncompliant
export var a = function foo() {} // Noncompliant
export var a // Noncompliant

export class C { }  // OK
export function foo() {}  // OK
export function * foo() {} // OK

export default class C { }  // OK
export default function foo() {}  // OK
export default function * foo() {} // OK
export default class { }  // OK
export default function () {}  // OK
export default function * () {} // OK

export default a // Noncompliant
export default new C()  // Noncompliant
function f () {}
export default f  // Noncompliant

export default {prop: value} // Noncompliant

export * from "moduleName";   // OK
export default new C();       // OK

function foo() {
  class A {    // OK
  }
}
