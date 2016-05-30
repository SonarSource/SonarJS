  for (key in arr) { // Noncompliant {{Restrict what this loop acts on by testing each property.}}
//^^^
  print(arr[key]);
  print(arr[key]);
}

for (name in object) { // OK
}

for (name in object) // OK
  if (object.hasOwnProperty(name)) {
    print(object[name]);
  }

for (name in object) { // OK
  if (!object.hasOwnProperty(name)) {
    continue;
  }
  print(object[name]);
}

for (key in arr) { // Noncompliant
  function f() {}
  print(arr[key]);
}

for (key in obj)   // OK
    a[key] = b[key];

for (key in obj) {   // OK
    a[key] = b[key];
}

for (key in obj) {   // Noncompliant
    val = b[key];
}

for (key in obj) {      // Noncompliant
  a.b = key;
}


