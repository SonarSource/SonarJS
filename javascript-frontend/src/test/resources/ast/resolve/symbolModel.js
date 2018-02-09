
//implicit "eval" symbol

var a;
b = 1;

function f (p1) {
 // implicit "arguments" symbol
  var a;
  c = 1;  // implicit declaration - global scope
}

try {

} catch (e) {
  let a;
}

f((p2) => {return a+1}) // implicit "arguments" symbol

for (i of a){}
for (i in a){}

var func;

func(); // function declared below is called

function func() {
  console.log("function call");
}

Object.create(null);

let flowed: number;
for (let [arra, arrb] in a){}

function flowGenerics<T>(p3: T) {}

interface FlowInterface {

}
