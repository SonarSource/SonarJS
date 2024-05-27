// Delete a variable
function deleteVariable() {
  let variable = 5;
  delete variable;
}

// Delete a tuple
function deleteArray() {
  let array = ['test', 30];
  delete array;
}

// Delete a dictionary
function deleteDictionary() {
  let dict = {name: 'Bob'};
  delete dict;
}

// Delete a parameter
function deleteParameter(x) {
  delete x;
}

// Delete an object
function deleteObject() {
  class A {}
  let a = new A();
  delete a;
}

// Delete a class
function deleteClass() {
  class A {}
  delete A;
}

// Delete elements from a list
function deleteListElement() {
  let l1 = [1, 2];
  delete l1[0];
}


// Delete an element from a list using binary operator
function deleteListBinaryOp() {
  let l1 = [1, 2, 3];
  delete l1[1+1];
  let l2 = [1, 2, 3];
  delete l2[1-1];
}

// Delete an element from a dictionary
function deleteDictElement() {
  let person = {name: 'Bob', age: 20};
  delete person.age;
}
