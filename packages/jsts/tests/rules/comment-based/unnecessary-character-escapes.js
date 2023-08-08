const quote = "\'"; // Noncompliant {{Unnecessary escape character: \'.}}
//             ^

const octal  = "\8"; // Noncompliant [[qf1,qf2=0]] {{Don't use '\8' escape sequence.}}
//              ^^
// fix@qf1 {{Replace '\8' with '8'. This maintains the current functionality.}}
// edit@qf1 {{const octal  = "8";}}
// fix@qf2 {{Replace '\8' with '\\8' to include the actual backslash character.}}
// edit@qf2 {{const octal  = "\\8";}}
