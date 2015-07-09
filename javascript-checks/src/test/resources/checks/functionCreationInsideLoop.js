var funs = [];

for (var i = 0; i < 13; i++) {
  funs[i] = function() {              // NOK
    return i;
  };
}

print(funs[0]()); // 13 instead of 0

for (var i = 0; i < 10; i++) {
  funs[i] = (function(i) {            // NOK
    return function() {               // OK
      return i;
    };
  }(i));
}

print(funs[0]());


for (var i = 0; i < 10; i++) {
    funs[i] = (function * (i) {       // NOK
        return function() {           // OK
            return i;
        };
    }(i));
}

print(funs[0]());
