function fun() {
  var x;               // NOK
}
var x;                 // <--  global x

var [y, z] = [1, 2];   // <--  global y, z

function fun(x) {      // NOK
}

function fun(y) {      // NOK
}

function fun(...x){    // NOK
}

function fun() {
    let x;             // NOK
    const y;           // NOK
}

function* fun(x) {     // NOK
}

class C {

    f(x) {             // NOK
      var y;           // NOK
    }

    *g (x){            // NOK
       var y           // NOK
    }
}

var a = () => {
    var x;             // NOK
};

var obj = {

    get x () {
        var c;
    },

    doSomething () {
        var c;         // OK
    }
}
