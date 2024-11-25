const foo = "login=a&secret=aaaaaaaaaaaaaabcdefg"; // Compliant
const bar = "login=a&marmalade=aaaaaaaaaaaaaabcdefg"; // Noncompliant {{'marmalade' detected in this expression, review this potentially hard-coded secret.}}
//                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
