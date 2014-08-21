/**
 * ECMAScript 5 and ECMAScript 6
 */
var implements; // NOK
var interface; // NOK
var package; // NOK
var private; // NOK
var protected; // NOK
var public; // NOK
var static; // NOK

/**
 * ECMAScript 5 only
 */
var let; // NOK - ES5
var yield; // NOK - ES5

var container = {
  implements: true // OK
}

function* f() {
    yield 1;       // OK
}