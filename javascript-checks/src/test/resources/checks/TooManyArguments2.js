function bar(p1, p2){}

bar(1, 2, 3);                          // Noncompliant [[sc=4;ec=13;el=+0;secondary=-2]] {{"bar" declared at line 1 expects 2 arguments, but 3 were provided.}}


function builtIn_StringFunctions() {
  "hello".charAt();                    // OK, too few arguments
  "hello".charAt(1, 2, 3);             // Noncompliant {{"charAt" expects 1 argument, but 3 were provided.}}
}
