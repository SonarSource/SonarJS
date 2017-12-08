alert("bla");                           // Noncompliant {{Remove this usage of alert(...).}}
prompt("bla");                           // Noncompliant {{Remove this usage of prompt(...).}}
confirm("bla");                           // Noncompliant {{Remove this usage of confirm(...).}}

obj.alert("bla");                       // OK
new alert();                            // OK
var a = function alert() {return 1;};   // OK

`alert` ();                             // OK
`${alert()}`;                           // Noncompliant [[sc=4;ec=11;el=+0]]

alert("bla")();                              // Noncompliant [[sc=1;ec=13;el=+0]]
