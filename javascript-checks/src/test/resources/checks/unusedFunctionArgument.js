each(function fun(a, b) {    // Noncompliant {{Remove the unused function parameter "b".}}
//                   ^
  a = 1;
});

// Noncompliant@+2 {{Remove the unused function parameter "b".}}
// Noncompliant@+1 {{Remove the unused function parameter "c".}}
each(function fun(a, b, c) {
  a = 1;
});

each(function fun(p1) {      // Noncompliant {{Remove the unused function parameter "p1".}}
});

each(function fun(a, b, c) { // Noncompliant {{Remove the unused function parameter "c".}}
  b = 1;
});

each(function* fun(a, b) {   // Noncompliant
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


function fun(a, b) {         // Noncompliant
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

function fun(a, ...b) {     // Noncompliant {{Remove the unused function parameter "b".}}
  return a;
}

function* fun(a, b) {       // Noncompliant
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
    fun(a) {               // Noncompliant
      }
  }
}

var fun = function(
      par1,
      par2,         // Noncompliant
      par3          // Noncompliant
){
    console.log(par1);
}


watch('!a', (value, previous) => logger.log(value)); // Noncompliant

var a = {
    set p(v){      // OK
    },
    get p(){
    }
}
