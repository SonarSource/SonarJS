function main(cond) {

  let x = null;
  if(cond) x = -1;
  doSomething();     // PS x=NULL || x=NEG_NUMBER
  if(isDef(x)) {
    doSomething();  // PS x=ANY_VALUE
    x = 1;          // PS x=POS_NUMBER
  } else {
    doSomething();  // PS x=ANY_VALUE
  }

  doSomething();  // PS x=ANY_VALUE || x=POS_NUMBER
  makeLive(x);

  // Retracing up the variable is not yet supported
  let y = null;
  if(cond) y = -1;
  var b = isDef(y);
  if(b) {
    doSomething();  // PS y=NULL || y=NEG_NUMBER
    makeLive(y);
  }

  // Multiple function arguments get dropped
  let a1, a2, a3;
  a1 = a2 = a3 = null;
  if(cond) a1 = a2 = a3 = -1;
  if(isDef(isDef(a1)) && isDef(a2, a3)) {
    doSomething();  // PS a1=ANY_VALUE & a2=ANY_VALUE & a3=ANY_VALUE
    makeLive(a1, a2, a3);
  }

  // OR is supported
  let a4, a5;
  a4 = a5 = null;
  if(cond) a4 = a5 = -1;
  if(isDef(a4) || isDef(a5)) {
    doSomething();  // PS a4=ANY_VALUE & a5=ANY_VALUE || a4=ANY_VALUE & a5=NEG_NUMBER || a4=ANY_VALUE & a5=NULL
    makeLive(a4, a5);
  }

  // In-line guards also drop variables
  let a6;
  a6 = null;
  if(cond) a6 = -1;
  isDef(a6) &&
    doSomethingWith(a6);  // PS a6=ANY_VALUE

  // Negated function still drops variables
  let a7;
  a7 = null;
  if(cond) a7 = -1;
  if(!isDef(a7)) {
    doSomething();  // PS a7=ANY_VALUE
    makeLive(a7);
  }

  // Variables dropped only if function result actually impacts branching
  let a8, a9;
  a8 = a9 = null;
  if(cond) a8 = a9 = -1;
  if(a8 || !isDef(a9)) {
    doSomething();  // PS a8=NULL & a9=ANY_VALUE || a8=NEG_NUMBER & a9=NEG_NUMBER
    makeLive(a8, a9);
  }

  // test that symbol is losing it's constraint at right moment
  let a10 = foo()
  let a11 = -1;
  if (a10 &&
     foo(a11)) {    // PS a10=TRUTHY & a11=NEG_NUMBER
     doSomething(); // PS a10=TRUTHY & a11=ANY_VALUE
     makeLive(a10, a11);
  }

  // test when condition has nested logical operator
  let a12 = null;
  if (isDef(a12) && (a || b)) {
    doSomething();  // PS a12=ANY_VALUE
    makeLive(a12);
  }
}
