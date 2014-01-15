var b = false ? (true ? (false ? (true ? 1 : 0) : 0) : 0) : 1;      // NOK

var c = true || false || true || false || false;                    // NOK

var d = true && false && true && false && true && true;             // NOK

function f() {
  if ((true ? 0 : 1) || false || true && false && true || false) {  // NOK
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
  var foo = true && true && true &&                                // NOK
      function () {                                                // OK
    var a = true && true && true && false && false;                // NOK
    var a = true && true && true;                                  // OK
  }() &&
  true;
}

var foo =  [                                                       // OK
  true && true && true && true,                                    // OK
  true && true && true && true && true                             // NOK
];

for (i = a ? (b ? (c ? (d ? 1 : 1) : 1) : 1) : 1; i < a; i++) {}   // NOK
