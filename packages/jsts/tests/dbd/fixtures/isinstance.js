// Technology stack: JavaScript

function isInstanceWithStaticType(x) {
  return typeof x === 'number';
}

function otherQualifiedIsInstanceWithOneArgument(x) {
  return other.isInstance(x);
}

function otherQualifiedIsInstanceWithTwoArguments(x) {
  return other.isInstance(x, 'number');
}

function isInstanceWithRuntimeType(x, t) {
  return x instanceof t;
}

function isInstanceWithSeveralTypesIsNotSupported(x) {
  return typeof x === 'number' || typeof x === 'boolean' || typeof x === 'string';
}

class A {
}

class B extends A {
}

class C extends Unknown {
}

function isInstanceWithB(x) {
  return x instanceof B;
}

function isInstanceWithC(x) {
  return x instanceof C;
}
