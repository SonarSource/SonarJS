a; // Noncompliant [[id=1]] {{25}}
function foo() {
  x && y;
//S ^^ 1 {{+1}}
  function foo1() {
    if (x) {}
//S ^^ 1 {{+1}}
  }
}

function bar() {
    if (x) {}
//S ^^ 1 {{+1}}
    function bar1() {
      if (x) {}
//S   ^^ 1 {{+2 (incl. 1 for nesting)}}
    }
}

    if (x) {
//S ^^ 1 {{+1}}
      function zoo() {
       x && y;
//S      ^^ 1 {{+1}}
       function zoo2() {
         if (x) {}
//S      ^^ 1 {{+2 (incl. 1 for nesting)}}
       }
      }

      function zoo1() {
        if (x) {}
//S     ^^ 1 {{+2 (incl. 1 for nesting)}}
      }

    }

x   && y;
//S ^^ 1 {{+1}}

    if (x) {
//S ^^ 1
      if (y) {
//S   ^^ 1
        function nested() {
          if (z) {}
//S       ^^ 1
          x && y;
//S         ^^ 1
        }
      }

      class NestedClass {

        innerMethod() {
          if (x) {}
//S       ^^ 1 {{+2 (incl. 1 for nesting)}}
        }

      }

    }

class TopLevel {

  someMethod() {
    if (x) {
//S ^^ 1 {{+1}}
      class ClassInClass {

        innerMethod() {
          if (x) {}
//S       ^^ 1 {{+3 (incl. 2 for nesting)}}
        }
      }
    }
  }
}
