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
          .on('mousemove', function (e) { that.process(e); })       //  OK - exception
          .on('mouseup', function (e) { that.process(); });         //  OK - exception
      jQuery('x').on('mousedown', function (e) { that.process(e); }); // OK - exception

      jQuery('x').on('mousedown', function (e) { that.process(e);   // NOK
       foo()
      });

      jQuery('x')
        .on('mousedown', function (e) { that.process(e);   // OK - False Negative
         foo()
        });

      jQuery('x').on('mousedown',
            function (e) { that.process(e);   // OK
                           foo()
            }
      );

    });
}
