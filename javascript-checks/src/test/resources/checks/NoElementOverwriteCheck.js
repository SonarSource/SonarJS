
function test(cond) {
  let fruits = [];
  fruits[1] = "banana";
  fruits[1] = "apple"; // Noncompliant {{Verify this is the index that was intended; '1' was already set on line 4.}}
//^^^^^^
  fruits = [];
  fruits[1] = "banana";
  fruits[1] = "apple"; // Noncompliant
  if (cond) {
    fruits[1] = "potato"; // Compliant, because it's another block
  }

  fruits[2] = "orange";
  fruits[2] = fruits[2] + ";"; // Compliant
  for (let i = 0; i < 10; i++) {
    fruits[i] = "melon";
    fruits[i] = "pear";  // Noncompliant
    fruits[i++] = "another";
  }

  let numbers = new Array();
  numbers[1] = 42;
  numbers = new Array();
  numbers[1] = 42; // Compliant
}

function map() {
  const myMap = new Map();
  myMap.set("key", 1);
  myMap.set("key", 2); // Noncompliant {{Verify this is the index that was intended; 'key' was already set on line 30.}}
  myMap.clear();
  myMap.set("key", 1);

  let notMap = foo();
  notMap.set("key"); // OK, not 2 arguments
  notMap.set("key");
}

function set() {
  const mySet = new Set();
  mySet.add(1);
  mySet.add(2);
  mySet.add(3);
  mySet.add(2);  // Noncompliant
  mySet.clear();
  mySet.add(2); // Compliant

  let notSet = foo();
  notSet.add(1, 2); // OK, not 1 argument
  notSet.add(1, 2);
}


function properties(person, x) {
  person.first = "John";
  person.first = "Smith"; // Noncompliant
  person.last = "Smith";
  person.last = person.last + " ";
  person.last = person.last + "-"; // Compliant, used on RHS
  person.last += ";";
  person = {};
  person.last = "Andersen";

  x.bla = x.y;
  x.foo = x.y;

  x.y.width = 1;
  x.z.width = 2;
}


class Test {
  propertyAccess(i) {
    this.arr[i] = 2;
    this.arr[i] = 3; // FN Noncompliant
    this.arr[i] = Math.max(this.arr[i], 0);
  }
}

let global = [];
global[1] = "foo";
global[1] = "bar"; // Noncompliant

function anotherCollection() {
  let x = [1,], y = [1, ];
  x[1] = 3;
  y[1] = x[1];
  x[1] = 43; // Compliant
}

function switchTest(kind: number) {
  let result = [];
  switch (kind) {
    case 1:
      result[1] = 1;
      result[1] = 2;  // Noncompliant
      break;
    case 2:
      result[2] = 1;
      result[2] = 2; // Noncompliant
      break;
  }
}

function indexChanges() {
  let nums = [];
  let i = 1;
  nums[i++] = 42;
  nums[i++] = 43;
  i += 1;
  nums[i] = 2;
  i += 1;
  nums[i] = 2;
}
