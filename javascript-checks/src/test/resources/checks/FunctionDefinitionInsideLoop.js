var funs = [];

for (var i = 0; i < 13; i++) {
  funs[i] = function() {              // Noncompliant {{Define this function outside of a loop.}}
//          ^^^^^^^^
    return i;
  };
}

for (var i = 0; i < 13; i++) {
  funs[i] = () => {              // Noncompliant {{Define this function outside of a loop.}}
//             ^^
    return i;
  };
}

for (var i = 0; i < 10; i++) {
  funs[i] = (function() {            // Noncompliant
    return function() {               // OK
      return i;
    };
  }(i));
}

for (var i = 0; i < 10; i++) {
    funs[i] = (function * () {       // Noncompliant
        return function() {           // OK
            return i;
        };
    }(i));
}

for (var i = 0; i < 10; i++) {
  funs[i] = function(i) {  // OK, no variable from outer scope is used
    return i;
  }
}

for (var i = 0; i < 10; i++) {
  funs[i] = function() {  // OK, no variable from outer scope is used
    var x = 42;
    var nested = function() {
      return x;
    }

    return nested;
  }
}

for (let i = 0; i < 13; i++) {
  funs[i] = function() {              // Ok, 'let' declaration
    return i;
  };
}

function value_written_once() {

  var constValue = 42;
  for (let i = 0; i < 13; i++) {
    funs[i] = function() {              // Ok, unchanged value is referenced
      return constValue;
    };
  }

  for (let i = 0; i < 13; i++) {
    var constValue = i + 42;
    funs[i] = function() {              // Noncompliant, written inside loop
      return constValue;
    };
  }

}

function iife_ok() {
  for (var i = 0; i < 13; i++) {

    (function() {         // OK
      return i;
    })();

    (function() {         // OK
      return i;
    }).call(this);
  }
}

function some_callbacks_ok() {
  for (var i = 0; i < 13; i++) {

    str.replace("a", function() {         // OK
      return i;
    });

    arr.forEach(function() {              // OK
      return i;
    });

    arr.filter(function() {              // OK
      return i;
    });

    arr.map(function() {              // OK
      return i;
    });

    arr.unknown(function() {              // Noncompliant
      return i;
    });
  }
}
