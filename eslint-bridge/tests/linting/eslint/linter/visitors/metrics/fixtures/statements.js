let x = 42; // 1
; // 2
foo(); // 3
if (x) {} // 4
while(x) break // 5 + 6
function foo() {
  debugger; // 7
  return;   // 8
}
try { // 9
  do{} while (x); // 10
} catch (e) {}
finally {}
