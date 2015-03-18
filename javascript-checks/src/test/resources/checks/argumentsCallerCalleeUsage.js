function global() {
  arguments.callee;             // NOK
  arguments.caller;             // NOK

  function f() {
    f.caller;                   // NOK
    f.arguments;                // NOK
  }

  var g = function g() {
    g.caller;                   // NOK
    var h = function () {
      g.arguments;              // NOK
    }
  }

  var c =
class
  {
    i()
    {
      i.caller                  // NOK
      h.arguments;              // OK - out of scope
    }
  }

  arguments.bugspot;            // OK
  myObject.caller;              // OK
  myObject.arguments.caller;    // OK
  myObject.callee;              // OK
  myObject.callee;              // OK

}
