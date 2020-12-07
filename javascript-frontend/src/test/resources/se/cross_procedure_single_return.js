function main(array, i) {

  var bar = function () {
    var str = "abc";
    return str + 42; // returns String
  }

  var barReturn = bar();
  foo(barReturn); // PS barReturn=STRING

  bar = function() {
    if (condition) {
      return "";
    } else {
      return "abc";
    }
  }

  barReturn = bar();
  foo(barReturn); // PS barReturn=STRING

  bar = function() {
    try {
      return foo();
    } catch (e) {
      return true;
    }
  }

   barReturn = bar();
   // we can't resolve return of the function call, as function contains try/catch
   foo(barReturn); // PS barReturn=ANY_VALUE

   bar = function() {
      var nested = function() { return 5; }
      return nested();
   }

   barReturn = bar();
   foo(barReturn); // PS barReturn=POS_NUMBER

   bar = function() {
      if (condition) {
        return 5;
      }
      // if "condition" is false, function returns "undefined" implicitly
   }

   barReturn = bar();
   foo(barReturn); // PS barReturn=UNDEFINED_OR_POS_NUMBER

   bar = function() {
      if (condition) {
        return 5;
      }

      return; // expression-less return of "undefined"
   }

   barReturn = bar();
   foo(barReturn); // PS barReturn=UNDEFINED_OR_POS_NUMBER


}
