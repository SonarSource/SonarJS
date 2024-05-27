function outerFunction() {
  let outerVar = 1;
  let anotherOuterVar = 2;
  function innerFunction() {
    let innerVar = outerVar;
    return innerVar;
  }
  innerFunction();
}

class Box {
  constructor() {
    this.x = 0;
  }
}

let a = 3;
let b = new Box();
let c = 2;

function testClosureVariableEscape() {
  a = 3;
  b.x = 2;
  b.x = 4;
  let c = 4;
  outerFunction();
  let d = new Box();
}

