console.log(this); // OK

console.log(this.prop); // NOK

this.a = function(){}  // NOK

var x = this.a()   // NOK


function foo(){
  x = this.a    // OK

  var func = s => this.foo(s)   // OK

  var func1 = s => {return this.foo(s)} // OK
}


var foo = function(){
  foo(this)     // OK
}

var func = s => this.foo(s)   // OK

class C {
  constructor() {
    this.a = [];   // ok
  }

  method1(){
    this.a = [];  // ok
  }

  get getMethod() {
    return this.bones.length;  // ok
  }

  set setMethod() {
    this.id = 1;  // ok
  }
}