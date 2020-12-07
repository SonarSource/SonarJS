// Apart from this line, only executable lines should contain non-blank comments

function f() {
  return; // 1
}

console // 1
  .log("hello");

label1: // 1
console.log(""); // 1

if ( // 1
  false
) {
  throw e; // 1
}

for( // 1
  var i = 0; i < 3; i++) {
  continue; // 1
}

for( // 1
  var prop in obj    
) {
  console.log("") // 1
}

for( // 1
    var a of b    
  ) {
    console.log("") // 1
  }

do // 1
{
  console.log("") // 1
} 
while(false);

while(false) { // 1
  console.log("") // 1
}

let let1; // 1
const const1 = 42; // 1
var x = 1; // 1
var y // 1
 = 2;

var obj = // 1
{
  prop1: 42    
}

switch // 1
(x)
{
  case 1:
    console.log(1); // 1
  case
    2:
    console.log(2); // 1
    break; // 1
  default:
    break; // 1
}

try { // 1
  console.log(1); // 1
}
catch(e) {
  console.log(1); // 1
}
finally {
  console.log(1); // 1
}

;

debugger; // 1

class Polygon {
  constructor(height, width) {
    this.height = height; // 1
  }
}

import 'module1';
export { name1 };
