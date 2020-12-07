function main(array, i) {

  var bar = function (p) {
    return p + 42; // returns String
  }

  var barReturn = bar("str");
  foo(barReturn); // PS barReturn=STRING

  barReturn = bar(1);
  foo(barReturn); // PS barReturn=NUMBER

  bar = function (p1, p2) {
    return condition ? p1 : p2;
  }
  barReturn = bar(1);
  foo(barReturn); // PS barReturn=UNDEFINED_OR_POS_NUMBER
  barReturn = bar(1, 2);
  foo(barReturn); // PS barReturn=POS_NUMBER
  barReturn = bar();
  foo(barReturn); // PS barReturn=UNDEFINED

  bar = function (p1, p2) {
    return p2;
  }
  barReturn = bar(true, false);
  foo(barReturn); // PS barReturn=FALSE
  barReturn = bar(false, true);
  foo(barReturn); // PS barReturn=TRUE

// NOT SUPPORTED

  bar = function([p1, p2]) {
    return p1;
  }
  barReturn = bar([1, 2]);
  foo(barReturn); // PS barReturn=ANY_VALUE

  bar = function(p = 2) {
    return p;
  }
  barReturn = bar();
  foo(barReturn); // PS barReturn=ANY_VALUE


}
