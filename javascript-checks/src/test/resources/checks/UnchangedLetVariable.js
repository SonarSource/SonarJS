let v1 = 1;  // Noncompliant {{Make "v1" "const".}}
foo(v1);

var v2 = 1; // OK
foo(v2);

const v3 = 1; // OK
foo(v3);

let v4 = 1;  // OK, unused

let v5;   // OK, not initialized during declaration
v5 = 10;
foo(v5);

for (let i=0, n=arr.length; i<n; i++) {  // OK, there is more than 1 identifier
   // ...
}

let j = 0
for (let n=arr.length; i<n; i++) {  // Noncompliant {{Make "n" "const".}}
   // ...
}

for (;;) {}

let [x1, x2, x3] = obj;  // OK, although x2 is not updated (we make an exception for array/object binding pattern)
x1 = 1;
x3 = 2;
foo(x1, x2, x3);

let [x4] = obj;          // Noncompliant {{Make "x4" "const".}} (we make no exception for array/object binding pattern of size 1)
foo(x4);

let {y1, y2, y3} = obj;  // OK, although y2 is not updated (we make an exception for array/object binding pattern)
y1 = 1;
y3 = 2;
foo(y1, y2, y3);

let {y4} = obj;          // Noncompliant {{Make "y4" "const".}} (we make no exception for array/object binding pattern of size 1)
foo(y4);
