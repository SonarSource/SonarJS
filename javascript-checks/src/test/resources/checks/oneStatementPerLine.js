function sayHello() {
  alert("Hello World!"); alert("Hello World!"); // NOK

  if (a) {} // OK

  if (a) {} if (b) {} // NOK

  while (condition); // OK

  label: while (condition) { // OK
    break label; // OK
  }

   A.doSomething(function () {
      jQuery('x')
          .on('mousemove', function (e) { that.process(e); })       //  FN (in current impl), should be negative in new implementation
          .on('mouseup', function (e) { that.process(); });         //  FN (in current impl), should be negative in new implementation
      jQuery('x').on('mousedown', function (e) { that.process(e); }); // Issue (in current implementation). should not be in new implmemetation
    });
}
