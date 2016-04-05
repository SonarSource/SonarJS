let v1 = 1;  // Noncompliant {{Make "v1" "const".}}
foo(v1);

var v2 = 1; // OK
foo(v2);

const v3 = 1; // OK
foo(v3);

let v4 = 1;  // OK, unused

let v5;   // OK, not initialization during declaration
v5 = 10;
foo(v5);

for (let i=0, n=arr.length; i<n; i++) {  // OK
   // ...
}

let j = 0
for (let n=arr.length; i<n; i++) {  // Noncompliant {{Make "n" "const".}}
   // ...
}

for (;;) {}
