class A {
  foo() { // 1
    return function(){};// 2
  }
  get x() { // 3
    return 42;
  }
}
function bar(){ // 4
  return ()=>42; // 5
}
function * gen(){} // 6
