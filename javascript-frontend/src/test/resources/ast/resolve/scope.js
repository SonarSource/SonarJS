var a;    // +1 scope [a, b, f, const1, let1, c, A, notBlock, gen, catch1, try2, identifier, foobar]
b = 1;    // implicit declaration - global scope
const const1 = 1;
let let1 = 1;





function f (p) {  // +1 scope [p, a, b]
  var a;
  c = 1;  // implicit declaration - global scope

  var b = function g() {  // +1 scope [g, a, x]
    var x;
    var a;
    var x;
  }
}





try {    // +1 scope [try1]
  let try1 = 1;
  var try2 = 1;
} catch (e) {    // +1 scope [e]
  var catch1;
} finally {     // +1 scope []

}




while (true) { // +1 scope [while1]
  let while1;
}


do {           // +1 scope [doWhile1]
  const doWhile1 = 1;
} while (true);




for (let let3 of b) {    // +1 scope [let3, const1, const2, let2]
  const const1 = 1;
  const const2 = 1;
  let let2 = 1;
  var notBlock = 1;
}



for (let let4 in b) {    // +1 scope [let4]
}



for (let let5 = 1; let5 < 10; let5++) {    // +1 scope [let5]
}




if (true) {    // +1 scope []
} else {    // +1 scope []
}



switch (b) {    // +1 scope [let6]
  case 1:
    let let6 = 1;
}



function * gen() {  // +1 scope []
}


class A {    // +1 scope []
  f(){    // +1 scope []
  }

  *g(){    // +1 scope []
  }

  set prop(v){ // +1 scope [v]
  }
}



(p1)=>1;  // +1 scope [p1]
(p2)=>{   // +1 scope [p2, x]
  var x = 1;
  return x;
};


var identifier = 1;
if (true) {
  identifier = 10;
}

function foobar() {
  console.log(identifier);
}

if (condition) {
  function globalFunction(){}
}
