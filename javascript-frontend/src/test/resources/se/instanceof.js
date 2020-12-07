function main() {

  var num = 5;
  var fun = function(){};
  var obj = new FooBar();
  var unknown = foo();

  var instanceOfResult;

  instanceOfResult = num instanceof Number;
  makeLive(instanceOfResult); // PS instanceOfResult=FALSE
  instanceOfResult = num instanceof Object;
  makeLive(instanceOfResult); // PS instanceOfResult=FALSE
  instanceOfResult = num instanceof UnknownConstructor;
  makeLive(instanceOfResult); // PS instanceOfResult=FALSE

  instanceOfResult = fun instanceof Number;
  makeLive(instanceOfResult); // PS instanceOfResult=FALSE
  instanceOfResult = fun instanceof Function;
  makeLive(instanceOfResult); // PS instanceOfResult=TRUE
  instanceOfResult = fun instanceof Object;
  makeLive(instanceOfResult); // PS instanceOfResult=TRUE
  instanceOfResult = fun instanceof UnknownConstructor;
  makeLive(instanceOfResult); // PS instanceOfResult=BOOLEAN

  instanceOfResult = obj instanceof Number;
  makeLive(instanceOfResult); // PS instanceOfResult=BOOLEAN
  instanceOfResult = obj instanceof Object;
  makeLive(instanceOfResult); // PS instanceOfResult=BOOLEAN
  instanceOfResult = obj instanceof FooBar;
  makeLive(instanceOfResult); // PS instanceOfResult=BOOLEAN
  instanceOfResult = obj instanceof Function;
  makeLive(instanceOfResult); // PS instanceOfResult=BOOLEAN

  instanceOfResult = unknown instanceof Number;
  makeLive(instanceOfResult); // PS instanceOfResult=BOOLEAN
  instanceOfResult = unknown instanceof Array;
  makeLive(instanceOfResult); // PS instanceOfResult=BOOLEAN
  instanceOfResult = unknown instanceof UnknownConstructor;
  makeLive(instanceOfResult); // PS instanceOfResult=BOOLEAN & unknown=ANY_VALUE

  if (unknown instanceof UnknownConstructor) {
    foo(); // PS unknown=NOT_NULLY
  }

  if (unknown instanceof Array) {
    foo(); // PS unknown=ARRAY
  } else {
    var flag = false;
    if (unknown instanceof Array) {
      flag = true;
    }
    foo(); // PS flag=FALSE
    makeLive(flag);
  }
  makeLive(unknown);

  unknown = foo();
  if (unknown instanceof Object) {
    foo(); // PS unknown=OBJECT
  }
  makeLive(unknown);

  unknown = foo();
  if (typeof unknown == "object" && unknown) {
    var flag = true;
    if (unknown instanceof Object) {
      flag = false;
    }
    foo(); // PS flag=TRUE || flag=FALSE
    makeLive(flag);
  }
  makeLive(unknown);

  unknown = foo();
  if (unknown instanceof Number) {
    foo(); // PS unknown=NUMBER_OBJECT
  }

  makeLive(unknown);
  
  unknown = foo();
  if (typeof unknown == "object") {
    var flag = true;
    if (unknown instanceof String) {
      flag = false;
    }
    foo(); // PS flag=TRUE || flag=FALSE
    makeLive(flag);
  }

  unknown = foo();
  if (typeof unknown == "object") {
    var flag = true;
    if (unknown instanceof Number) {
      flag = false;
    }
    foo(); // PS flag=TRUE || flag=FALSE
    makeLive(flag);
  }
  
  unknown = foo();
  if (typeof unknown == "object") {
    var flag = true;
    if (unknown instanceof Boolean) {
      flag = false;
    }
    foo(); // PS flag=TRUE || flag=FALSE
    makeLive(flag);
  }
}
