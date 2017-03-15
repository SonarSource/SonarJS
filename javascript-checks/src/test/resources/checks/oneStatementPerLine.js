function sayHello() {
  alert("Hello World!"); alert("Hello World!"); // Noncompliant [[sc=26;ec=48;el=+0]] {{Reformat the code to have only one statement per line.}}
  alert("Hello World!"); alert("Hello World!"); alert("Hello World!"); // Noncompliant [[sc=26;ec=48;el=+0;secondary=+0]] {{Reformat the code to have only one statement per line.}}

  if (a) {} // OK

  if (a) {} if (b) {} // Noncompliant [[sc=13;ec=22]]

  while (condition); // OK

  label: while (condition) { // OK
    break label; // OK
  }

   A.doSomething(function () {
      jQuery('x')
          .on('mousemove', function (e) { that.process(e); })       //  OK - exception
          .on('mouseup', function (e) { that.process(); });         //  OK - exception
      jQuery('x').on('mousedown', function (e) { that.process(e); }); // OK - exception

      jQuery('x').on('mousedown', function (e) { that.process(e);   // Noncompliant [[sc=50;ec=66]]
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

function singleNestedStatementIsOk() {

  if (a) doSomething();
  while (a) doSomething();
  do doSomething(); while(a);
  for(x in obj) doSomething();
  for(x of obj) doSomething();
  for(;;) doSomething();

  if (a) { doSomething(); } // Noncompliant
  if (a) doSomething(); doSomethingElse(); // Noncompliant

}
