var b = false ? (true ? (false ? (true ? 1 : 0) : 0) : 0) : 1;      // Noncompliant [[effortToFix=1]] {{Reduce the number of conditional operators (4) used in the expression (maximum allowed 3).}}

var c = true || false || true || false || false;                    // Noncompliant [[sc=9;ec=48;secondary=+0,+0,+0,+0]]

var d = true && false && true && false && true && true;             // Noncompliant

function f() {
  if ((true ? 0 : 1) || false || true && false && true || false) {  // Noncompliant [[effortToFix=3]] {{Reduce the number of conditional operators (6) used in the expression (maximum allowed 3).}}
  }
}

var e = true | false | true | false;                                // OK

var a = false ? (true ? (false ? 1 : 0) : 0) : 1;                   // OK


function g() {
  var a = function () {                                             // OK
    var a = true && true;
    var b = true && true;
    var c = true && true;
    var d = true && true;
    var e = true && true;
  };
}

function g() {
  var foo = true && true && true &&                                // Noncompliant
      function () {                                                // OK
    var a = true && true && true && false && false;                // Noncompliant
    var a = true && true && true;                                  // OK
  }() &&
  true;
}

var foo =  [                                                       // OK
  true && true && true && true,                                    // OK
  true && true && true && true && true                             // Noncompliant
];

for (i = a ? (b ? (c ? (d ? 1 : 1) : 1) : 1) : 1; i < a; i++) {}   // Noncompliant

function a() {
  return (
    a ||                                                           // Noncompliant [[secondary=+1,+0,+2,+2]]
    b ||
    (c || d || e));
}

var x = {   // OK
  prop1 : 1 || 2,
  prop2 : 4
}["prop1"] && 5 && 6 && 7;

x = a && b && c && foo(d && e);  // OK

x = {     // OK
  prop1 : 1 || 2 || 3,
  prop2 : 1 && 2 && 3
};

x = [    // OK
  1 || 2 || 3,
  1 && 2 && 3
];

foo(1 || 2 || 3, 1 || 2 || 3);  // OK
