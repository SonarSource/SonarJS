each(function fun(a, b) {    // NOK
  a = 1;
});

each(function fun(a, b, c) { // NOK
  a = 1;
});

each(function fun(p1) {      // NOK
});

each(function fun(a, b, c) { // NOK
  b = 1;
});

each(function* fun(a, b) {   // NOK
    a = 1;
});

each(function fun(a, b) {    // OK
  b = 1;
});

each(function fun(a) {       // OK
  a = 1;
});

each(function fun(a) {       // OK
  return o.call(arguments);
});


function fun(a, b) {         // NOK
    a = 1;
}

function fun(a, b, c) {      // OK
  a = 1;
  c = 1;
}

function fun(a, b) {         // OK
  a = 1;
  o.call(arguments);
}

function fun(a) {            // OK
  function nested() {
    a = 1;
  }
}

function fun(a, ...b) {     // NOK
  return a;
}

function* fun(a, b) {       // NOK
    return a;
}

class C {
    set  value(value) {
        this.value = value; // OK
    }
}

function fun(a) {           // OK
  return {a};
}

function fun() {
  return {
    fun(a) {               // NOK
      }
  }
}

var fun = function(         // NOK - issue on this line
      par1,
      par2,
      par3
){
    console.log(par1);
}


watch('!a', (value, previous) => logger.log(value)); // NOK

var a = {
    set p(v){      // OK
    },
    get p(){
    }
}