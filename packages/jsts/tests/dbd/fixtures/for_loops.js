function forLoop(myList) {
  for (let i of myList) {
    console.log(i);
  }
}

function forLoopReturnInBody(myList) {
  for (let i of myList) {
    console.log(i);
    return;
  }
}

function forLoopUnknownIterable() {
  for (let i of unknown) {
    console.log(i);
  }
}

function forLoopWithMultipleTarget(myList) {
  for (let [i, j] of myList) {
    console.log(i);
  }
}

function forLoopWithMultipleIterable(myList1, myList2) {
  for (let i of [myList1, myList2]) {
    console.log(i);
  }
}

function forLoopWithTargetDifferentThanName(obj, myList) {
  for (obj.foo of myList) {
    console.log(obj.foo);
  }
}
