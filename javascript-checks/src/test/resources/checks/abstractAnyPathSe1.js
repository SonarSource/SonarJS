function foo(x) {
  for (let i = 0; i < 2; i++) {
    x.toString();       // Noncompliant {{DOT_MEMBER_EXPRESSION}}
  }  
}

function foo(x) {
  for (let i = 0; i < 2; i++) {
    x = {prop1: 3};     // Noncompliant {{OBJECT_LITERAL}}
  }
}

function foo(x) {
  for (let i = 0; i < 2; i++) {
    x = 2 & 3;          // Noncompliant {{BITWISE_AND}}
  }  
}
