  
function testObject() {
  var obj = new Object();
  var obj2 = new Object();
  var date = new Date();
  var nul = null;
  var undef;
  var symb = Symbol();

  // 1. compare an object with the other types
  obj > 0;                     // Noncompliant {{Change this value so that the comparison does not consistently evaluate to "false".}}
//^^^
  obj > "hello";               // Noncompliant
//^^^
  obj > true;                  // Noncompliant
//^^^
  obj > false;                 // Noncompliant
//^^^
  obj >= symb;                 // Noncompliant
//^^^
// Noncompliant@+1
  obj >= date;                 // Noncompliant
//       ^^^^
  obj >= nul;                  // Noncompliant
//^^^
  obj >= undef;                // Noncompliant
//^^^
// Noncompliant@+1
  obj > obj2;                  // Noncompliant
  
  // 2. same as 1., but swapping left-hand side and right-hand side
  0 <= obj;                    // Noncompliant
//     ^^^
  "hello" <= obj;              // Noncompliant
  true <= obj;                 // Noncompliant
  symb < obj;                  // Noncompliant
// Noncompliant@+1
  date < obj;                  // Noncompliant
  nul < obj;                   // Noncompliant
  undef < obj;                 // Noncompliant
  
  // 3. compare an object with itself
  var objAlias = obj;
// Noncompliant@+1
  obj > obj;                   // Noncompliant
  obj >= obj;                  // OK (returns true, actually)
// Noncompliant@+1
  objAlias < obj;              // Noncompliant
  objAlias <= obj;             // OK (returns true, actually)
  
  // 4. other cases
// Noncompliant@+1
  if (obj < function(){}){}    // Noncompliant
  if (1 < function(){}){}      // Noncompliant
//        ^^^^^^^^^^^^
// Noncompliant@+1
  var x = (obj >= obj2);       // Noncompliant
//                ^^^^
}

function testUndefined() {
  var undef;
  var nul = null;

  undef > 0;                   // Noncompliant
//^^^^^
  undef >= "hello";            // Noncompliant
// Noncompliant@+1
  undef <= undef;              // Noncompliant
  nul < undef;                 // Noncompliant
}

function notTwoIssuesForSameOperand() {
  var obj = new Object();
  for (var i = 0; i< 10; i++) {
    if (obj > 1) {}            // Noncompliant
  }
}
  
function testDate() {
  var date = new Date();
  var date2 = new Date();

  date > date2;                // OK
  date >= date2;               // OK
  date < date2;                // OK
  date <= date2;               // OK
}

function testStuffNotCoveredByThisCheck() {
  var nul = null;
  var tru = true;

  1 < 2;                       // OK
  nul > "hello";               // OK
  tru <= Symbol();             // OK
}
