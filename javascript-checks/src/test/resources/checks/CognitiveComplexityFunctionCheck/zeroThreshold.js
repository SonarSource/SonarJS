function zero_complexity(){
}

  function if_else_complexity() { // Noncompliant [[effortToFix=3;id=IF_ELSE]] {{Refactor this function to reduce its Cognitive Complexity from 3 to the 0 allowed.}}
//^^^^^^^^
    if (condition) {        // +1
//S ^^ IF_ELSE {{+1}}
    } else if (condition) { // +1
//S        ^^ IF_ELSE {{+1}}
    } else {                // +1
//S   ^^^^ IF_ELSE {{+1}}
    }
}


function else_nesting() {    // Noncompliant [[effortToFix=4]]
    if (condition) {      // +1

    } else {              // +1 (nesting level +1)
        if (condition) {} // +2
    }
}


function else_nested() {    // Noncompliant [[effortToFix=4]]
    if (condition) {      // +1 (nesting level +1)

        if (condition) {  // +2

        } else {          // +1

        }
    }
}

function if_nested() { // Noncompliant [[effortToFix=6]]
    if (condition)          // +1 (nesting level +1)
        if (condition)      // +2 (nesting level +1)
            if (condition) {// +3
            }
}

function else_if_nesting() {    // Noncompliant [[effortToFix=4]]
    if (condition) {         // +1

    } else if (condition)    // +1 (nesting level +1)
        if (condition) {     // +2
        }
}



function loops_complexity() {    // Noncompliant [[effortToFix=17;id=LOOPS]]
    while (condition) {             // +1 (nesting level +1)
//S ^^^^^ LOOPS {{+1}}
        if (condition) {            // +2
//S     ^^ LOOPS
        }
    }

    do {                            // +1 (nesting level +1)
//S ^^ LOOPS {{+1}}
        if (condition) {            // +2
//S     ^^ LOOPS
        }
    } while (condition)

    for (i = 0; i < length; i++) {  // +1 (nesting level +1)
//S ^^^ LOOPS {{+1}}
        if (condition) {            // +2
//S     ^^ LOOPS
        }

        for (i = 0; i < length; i++) {  // +2
//S     ^^^ LOOPS
        }
    }

    for (x in obj) {                // +1 (nesting level +1)
//S ^^^ LOOPS {{+1}}
        if (condition) {            // +2
//S     ^^ LOOPS
        }
    }

    for (x of obj) {                // +1 (nesting level +1)
//S ^^^ LOOPS {{+1}}
        if (condition) {            // +2
//S     ^^ LOOPS
        }
    }
}

function switch_statement() {   // Noncompliant [[effortToFix=6;id=SWITCH]]
    if (condition) {                 // +1 (nesting level +1)
//S ^^ SWITCH

    switch (expr) {                // +2 (nesting level +1)
//S ^^^^^^ SWITCH {{+2 (incl. 1 for nesting)}}
       case "1":
          if (condition) {}        // +3
//S       ^^ SWITCH {{+3 (incl. 2 for nesting)}}
          break;
       case "2":
          break;
       default:
          foo();
    }
  }
}

function try_catch() {    // Noncompliant [[effortToFix=5;id=TRY_CATCH]]
    try {
        if (condition) { }   // +1
//S     ^^ TRY_CATCH
    } catch (someError) {    // +1 (nesting level +1)
//S   ^^^^^ TRY_CATCH {{+1}}
        if (condition)  { }  // +2
//S     ^^ TRY_CATCH
    } finally {
        if (condition) { }   // +1
//S     ^^ TRY_CATCH
    }
}

function try_finally() {    // Noncompliant [[effortToFix=2]]
    try {
        if (condition) { } // +1

    } finally {
        if (condition) { } // +1
    }
}

function nested_try_catch() { // Noncompliant [[effortToFix=3;id=NESTED_TRY_CATCH]]
  try {
    if (condition) { // +1 (nesting level +1)
//S ^^ NESTED_TRY_CATCH
      try {}
      catch (someError) { // +2
//S   ^^^^^ NESTED_TRY_CATCH
      }
    }
  } finally {
  }
}

function jump_statements_no_complexity() {   // Noncompliant [[effortToFix=6]]
    if (condition)         // +1
        return;
    else if (condition)    // +1
        return 42;

    label:
    while (condition) {    // +1 (nesting level +1)
        if (condition)     // +2
            break;
        else if (condition)// +1
            continue;
    }
}

function break_continue_with_label() {   // Noncompliant [[effortToFix=3;id=BREAK_CONTINUE]]
    label:
    while (condition) {
//S ^^^^^ BREAK_CONTINUE
        break label;   // +1
//S     ^^^^^ BREAK_CONTINUE {{+1}}
        continue label;// +1
//S     ^^^^^^^^ BREAK_CONTINUE {{+1}}
    }
}

// TODO recursion +1
function recursion() {  // Noncompliant [[effortToFix=2]]
    if (condition)
        return 42;
    else
        return recursion();
}

function nesting_func_no_complexity() {  // Ok
    function nested_func() { // Noncompliant [[effortToFix=1]]
        if (condition) { }   // +1
    }
}

function nesting_func_with_complexity() {  // Noncompliant [[effortToFix=3]]
    if (condition) {}          // +1
    function nested_func() {   // (nesting level +1)
        if (condition) { }     // +2
    }
}

function nesting_func_with_not_structural_complexity() {  // Noncompliant [[effortToFix=1;id=module]]
    return a && b;
//S          ^^ module {{+1}}
    function nested_func() {   // Noncompliant [[effortToFix=1;id=nested]]
        if (condition) { }
//S     ^^ nested {{+1}}
    }
}

function two_level_function_nesting() {
    function nested1() {
      function nested2() {   // Noncompliant [[effortToFix=1]]
          if (condition) { }     // +1
      }
    }
}

function two_level_function_nesting_2() {
    function nested1() {     // Noncompliant [[effortToFix=3]]
      if (condition) {}      // +1
      function nested2() {   // (nesting +1)
          if (condition) { } // +2
      }
    }
}

function with_complexity_after_nested_function() { // Noncompliant [[effortToFix=3]]
    function nested_func() {   // (nesting level +1)
        if (condition) { }     // +2
    }

   if (condition) {}           // +1
}

function and_or() {  // Noncompliant [[effortToFix=12;id=LOGICAL_OPS]]
    foo(1 && 2 && 3 && 4); // +1
//S       ^^ LOGICAL_OPS {{+1}}

    foo((1 && 2) && (3 && 4)); // +1
//S        ^^ LOGICAL_OPS {{+1}}

    foo(((1 && 2) && 3) && 4); // +1
//S         ^^ LOGICAL_OPS {{+1}}

    foo(1 && (2 && (3 && 4))); // +1
//S       ^^ LOGICAL_OPS {{+1}}

    foo(1 || 2 || 3 || 4); // +1
//S       ^^ LOGICAL_OPS {{+1}}

    foo(1 && 2
//S       ^^ LOGICAL_OPS {{+1}}
    || 3 || 4); // +2
//S ^^ LOGICAL_OPS {{+1}}


    foo(1 && 2
//S       ^^ LOGICAL_OPS {{+1}}
          || 3
//S       ^^ LOGICAL_OPS {{+1}}
          && 4); // +3
//S       ^^ LOGICAL_OPS {{+1}}

    foo(1 && 2 &&
//S       ^^ LOGICAL_OPS {{+1}}
      !(3 && 4)); // +2
//S       ^^ LOGICAL_OPS {{+1}}
}

function conditional_expression() { // Noncompliant [[effortToFix=1;id=TERNARY]]
    return condition ? trueValue : falseValue;
//S                  ^ TERNARY {{+1}}
}

function nested_conditional_expression() { // Noncompliant [[effortToFix=11]]
    x = condition1 ? (condition2 ? trueValue2 : falseValue2) : falseValue1 ; // +3
    x = condition1 ? trueValue1 : (condition2 ? trueValue2 : falseValue2)  ; // +3
    x = condition1 ? (condition2 ? trueValue2 : falseValue2) : (condition3 ? trueValue3 : falseValue3); // +5
}

class A {
    method() {  // Noncompliant [[effortToFix=1]]
//  ^^^^^^
        if (condition)  // +1
            class B {
            }
    }
}

var arrowFunction = (a, b) => a && b; // Noncompliant [[effortToFix=1]]
//                         ^^
var functionExpression = function(a, b) { return a && b; } // Noncompliant [[effortToFix=1]]
//                       ^^^^^^^^

function complexity_in_conditions(a, b) { // Noncompliant [[effortToFix=11]]
  if (a && b) {                      // +1(if) +1(&&)
    a && b;                          // +1 (no nesting)
  }

  while (a && b) {                    // +1(while) +1(&&)
  }

  do {                                // +1
  } while (a && b)                     // +1

  for (var i = a && b; a && b; a && b) { // +1(for) +1(&&)  +1(&&)  +1(&&)
  }
}

function several_nested() { // Noncompliant [[effortToFix=5]]
  if (condition) {    // +1 (+1 for nesting)
    if (condition) {} // +2
    if (condition) {} // +2
  }
}

// Some spaghetti code
(function(a) {  // Noncompliant [[effortToFix=1]]
  if (cond) {}
  return a;
})(function(b) {return b + 1})(0);
