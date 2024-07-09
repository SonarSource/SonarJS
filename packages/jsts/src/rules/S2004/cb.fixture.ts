function f1() {
//       ^^> {{Nesting +1}}
    function f2() {
//           ^^> {{Nesting +1}}
        function f3() {
//               ^^> {{Nesting +1}}
            function f4() {
//                   ^^> {{Nesting +1}}
                function f5() { // Noncompliant {{Refactor this code to not nest functions more than 4 levels deep.}}
//                       ^^
                }
            }
        }
    }
}
