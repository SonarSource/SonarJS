// AMD - NOK

define(["./cart", "./horse"], function(cart, horse) {  // Noncompliant {{Use a standard "import" statement instead of "define(...)".}}
  // ...
});

require(["./m1", "./m2"], function(m1, m2) {  // Noncompliant {{Use a standard "import" statement instead of "require(...)".}}
  // ...
} );

define("ModuleName", [], function(){  // Noncompliant [[sc=1;ec=7]]
});

define(1, 2); // OK, last argument is not function


// CommonJS - NOK

const circle = require('./circle.js');   // Noncompliant {{Use a standard "import" statement instead of "require(...)".}}
const square = require('./squire.js');  // Noncompliant [[sc=16;ec=23]]

require(1);  // OK, not string argument

var  a  = circle.area(42);
var s = square(5);

// circle.js
exports.area = function (r) {
  return PI * r * r;
};

// squire.js
module.exports = function(a) {
  return a * a;
}




// ES2015 Standard - OK

import A from "ModuleName";   // OK
import { member as alias } from "module-name";  // OK



// Ignore not global "imports"

if (cond) {
  require('./module.js');    // OK
}
