function sayHello() {
  for (key in arr) {
    print(arr[key]); // NOK
    print(arr[key]);
  }

  for (name in object) {
    if (object.hasOwnProperty(name)) { // OK
    }
  }

  for (key in arr) print(arr[key]); // NOK

  for (name in object)
    if (object.hasOwnProperty(name)) { // OK
    }

  for (name in object) {
    if (object.hasOwnProperty(name)) {
    }
    if (object.hasOwnProperty(name)) {
    }
    print(arr[key]); // NOK
  }
}
