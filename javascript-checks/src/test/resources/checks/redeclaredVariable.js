function fun() {
  var a = 1;
  var a = 2; // NOK
}

function fun(a) {
  var a = 1; // NOK
}

function fun() {
  var i = 1;
  for (var i = 0; i < 10; i++) { // NOK
  }
}

function fun() {
  var b = 1;
  var a = 2,
      b = 2; // NOK
}

function fun(...a) {
  var a = 2;  // NOK
}

function fun({a, b: {c}}) {
  var a;     // NOK
  var c;     // NOK
}

function fun({a:b}) {
  var a;     // OK
  var b;     // NOK
}

function* fun() {
    var a = 1;
    var a = 2; // NOK
}

var a = (a) => {
    var a;     // NOK
}

function* fun(a) {
    var a = 1; // NOK
}

function f() {
    var a = 1;

    for (var a in arr) { }
}

var obj = {
    set x(x) {
        var c;
    },

    set y (y) {
         var c;   // OK
    }
};
