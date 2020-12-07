function main(obj, arr) {

  for (var prop of obj) {
    bar(); // PS prop=ANY_VALUE
  }

  var element = null; // PS element=NULL
  for (element in arr) {
   bar(); // PS element=ANY_VALUE
  }

  var x = null, y;
  for (var key in x) {
    y = 42;
  }
  foo(); // PS y=UNDEFINED
  makeLive(y);

  for (let e1 in list) {
    if (e1) {
      foo(e1); // PS e1=TRUTHY
    }
  }

  for (const e2 in list) {
    if (e2) {
      foo(e2); // PS e2=TRUTHY
    }
  }

  var cnt = 0;
  var limit = 2;
  for(var e3 in obj){
    cnt++;
    if(cnt > limit){
      break;
    }
  }

}
