function sayHello() {
  var a = { // NOK
    'i': 1,
    'j': 2
  }

  return 1 // NOK

  if (condition) { // OK
  }

  for (i = 0; i < 10; i++) { // OK
  }

  label: while (condition) { // OK
    break label; // OK
  }

  return 1; // OK
}

import x from 'mod'  // KO
import x from 'mod'; // OK
import 'mod'  // KO
import 'mod'; // OK

function f() {
  do {} 
  while (false) // KO
  do {} 
  while (false); // OK
  throw x  // KO
  throw x; // OK
  debugger  // KO
  debugger; // OK
  while(false) {
    continue  // KO
    continue; // OK
  }
}


export * from "moduleName"   // NOK
export {a, b} from "moduleName"  // NOK
export {a, b}  // NOK
export var a = 1 // NOK
export let a = 1 // NOK
export const a = 1 // NOK
export var a = function() {} // NOK
export var a = function foo() {} // NOK
export var a // NOK

export class C { }  // OK
export function foo() {}  // OK
export function * foo() {} // OK

export default class C { }  // OK
export default function foo() {}  // OK
export default function * foo() {} // OK
export default class { }  // OK
export default function () {}  // OK
export default function * () {} // OK

export default a // NOK
export default new C()  // NOK
function f () {}
export default f  // NOK

export default {prop: value} // NOK

export * from "moduleName";   // OK
export default new C();       // OK

function foo() {
  class A {    // OK
  }
}
