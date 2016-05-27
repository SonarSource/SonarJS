var funs = [];

for (var i = 0; i < 13; i++) {
  funs[i] = function() {              // Noncompliant {{Define this function outside of a loop.}}
//          ^^^^^^^^
    return i;
  };
}

print(funs[0]()); // 13 instead of 0

for (var i = 0; i < 10; i++) {
  funs[i] = (function(i) {            // Noncompliant
    return function() {               // OK
      return i;
    };
  }(i));
}

print(funs[0]());


for (var i = 0; i < 10; i++) {
    funs[i] = (function * (i) {       // Noncompliant
        return function() {           // OK
            return i;
        };
    }(i));
}

print(funs[0]());
