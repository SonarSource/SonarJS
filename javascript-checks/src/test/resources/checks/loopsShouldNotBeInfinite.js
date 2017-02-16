
function null_condition_loop() {
    for ( ; ; ) {       // Noncompliant {{Add an end condition for this loop.}}
    }
}

function condition_symbol_written_in_loop_statement() {
    var a;
    var b;
    for (;a > b;) {     // OK
        a = true;
    }

    var c;
    while(c) {              // OK
      c = false;
    }
}

function condition_symbol_not_used_at_all() {
    var a;
    for (;a < 1;) {         // Noncompliant {{Correct this loop's end condition as to not be invariant.}}
        var b = 1;
    }
}

function condition_symbol_is_only_read() {
    var a;
    for(;a === false;) {    // Noncompliant
        var b = a;
    }

    var d;
    while(a > d) {          // OK
        d = a;
    }

    var c;
    while(a && c) {          // Noncompliant
        var e = a;
    }
}

function condition_is_static() {
    do {                    // Noncompliant [[secondary=+2]]
        foo();
    } while (true);

    while(true) {           // Noncompliant
      foo();
    }
}

function outer_loop_condition_changes_but_inner_loop_has_no_condition() {
    var i = -2;
    while(i < 0) {          // Noncompliant?
        for(;;) {           // Noncompliant
            i++;
        }
    }
}

function break_interrupts_loop() {
    while(true) {           // OK
        foo();
        if(g) {
            break;
        }
    }
}

function break_interrupts_inner_loop_but_not_outer_loop() {
    outer:
    while(true) {           // Noncompliant
        foo();
        while(true) {
            break;
        }
    }
}

function break_interrupts_outer_loop() {
    outer:
    while(true) {           // OK
        foo();
        while(true) {
            break outer;
        }
    }
}

function return_interrupts_loop() {
    while(true) {           // OK
        return;
    }

    for(;;) {               // OK Doubly-nested return
        for(;;) {
            return;
        }
    }
}

function throws_interrupts_loop() {
    for(;;) {               // OK
        throw "We are leaving!";
    }

    while(true) {           // OK Doubly-nested throw
        while(true) {
            throw "We are leaving from deep inside!";
        }
    }
}

function condition_symbol_updated_by_function() {
    var i = 0;
    while (i = bar()) {     // OK
        boo();
    }
}

function condition_is_a_function_call() {
    while (iterate()) {     // OK
    }

    function iterate() {
    }
}

function diverging_values_in_condition() {
    var j = 100;
    for (var i=0; i < j; i--) {     // OK Covered by S2251
        m++;
    }
}

function loop_not_executed() {
    while(false) {          // OK Covered by S2583
    }

    while(0) {              // OK Covered by S2583
    }
}

function conditions_being_touched_from_within_functions() {
    {
        var i = 0
        while(i < 3) {          // OK False negative
        }

        function unusedUpdateOutsideCFG() {
            i++;
        }
    }

    {
        var j = 0
        while(j < 3) {          // OK
            updateOutsideCFG();
        }

        function updateOutsideCFG() {
            j++;
        }
    }

    {
        var k = 0
        while(k < 3) {          // Noncompliant
            readOutsideCFG();
        }

        function readOutsideCFG() {
            var someVariable = k;
        }
    }

    {
        var obj = {i:3};
        while(obj.i < 3) {        // OK obj is an object so the function might change it
            doSomethingWithTheArgument(u);
        }
    }
}

function arrays_used_in_conditions() {
    var arr;
    while(arr[0]--) {                   // OK value is updated in condition
    }

    var readonlyArr;
    while(readonlyArr[0]) {             // OK False Negative
    }

    var shrinkingArr;
    while(shrinkingArr.length) {        // OK
        shrinkingArr.pop();
    }
}

function * generator() {
    while(true) {                   // Noncompliant False POSITIVE!! Needs evolution in CFG to support yield. See SONARJS-877
        foo();
        yield;
    }
}


function always_true() {

  var trueValue = true;

  while(trueValue) {        // Noncompliant
    trueValue = 42;
  }
}


function do_while() {

  var trueValue = true;

  do {                      // Noncompliant
    trueValue = true;
  } while (trueValue);
}


function with_parentheses() {

  var trueValue = true;

  while((trueValue)) {        // Noncompliant
    trueValue = true;
  }
}


function loop_broken() {

  var trueValue = true;

  while(trueValue) {        // OK
    trueValue = true;
    if (condition) {
      break;
    }
  }
}


function value_is_updated_to_false() {

  var trueValue = true;

  while(trueValue) {       // OK
    trueValue = false;
  }
}


function numeric_comparison() {

  var i = 0;
  while (i < 10) {         // OK
    i--;
    if (condition) {
      break;
    }
  }

  var i = 0;
  while (i < 10) {         // Noncompliant
    i--;
  }
}
