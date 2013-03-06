function sayHello() {
  for (key in arr) { // NOK
    print(arr[key]);
    print(arr[key]);
  }

  for (name in object) { // OK
    if (object.hasOwnProperty(name)) {
    }
  }

  for (key in arr) print(arr[key]); // NOK

  for (name in object) // OK
    if (object.hasOwnProperty(name)) {
    }

  for (name in object) { // NOK
    if (object.hasOwnProperty(name)) {
    }
    if (object.hasOwnProperty(name)) {
    }
    print(arr[key]);
  }

  for (name in object) { // OK
    if (!object.hasOwnProperty(name))
      continue;
    print(object[name]);
  }

  for (name in object) { // OK
    if (!object.hasOwnProperty(name)) {
      continue;
    }
    print(object[name]);
  }

  for (name in object) { // NOK
    if (object.hasOwnProperty(name)) {
      print(object[name]);
      continue;
    }
  }

  for (name in object) { // NOK
    if (object.hasOwnProperty(name))
      print(object[name]);
  }

  for (name in object) { // OK
  }
}
