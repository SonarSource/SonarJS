var {} = obj; // Noncompliant {{Change this pattern to not be empty.}}
//  ^^
var [] = obj; // Noncompliant
var {prop: {}} = obj; // Noncompliant
var {prop: []} = obj; // Noncompliant
function foo({}) {} // Noncompliant
function foo([]) {} // Noncompliant
function foo({prop: {}}) {} // Noncompliant
function foo({prop: []}) {} // Noncompliant

var obj = {}; // empty object literal
var arr = []; // empty array literal
var {prop : var1 = {}} = obj; // empty object literal, default value
var {prop1, prop2} = obj;
var [el1, el2] = arr;
