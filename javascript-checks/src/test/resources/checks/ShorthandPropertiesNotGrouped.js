let obj1 = {  // Noncompliant [[secondary=+1,+3,+5]] {{Group all shorthand properties at either the beginning or end of this object declaration.}}
  foo,
  a: 1,
  color,
  b: 2,
  judyGarland
}

let obj5 = {  // Noncompliant [[id=ID1]] {{Group all shorthand properties at the beginning of this object declaration}}
  foo,
  color,
  a: 1,
    c,
//S ^ ID1
  b: 2,
    judyGarland
//S ^^^^^^^^^^^ ID1
}

let obj6 = {  // Noncompliant [[id=ID2]] {{Group all shorthand properties at the end of this object declaration}}
  a: 1,
    foo,
//S ^^^ ID2
    color,
//S ^^^^^ ID2
  b: 2,
  c,
  judyGarland
}


let obj2 = {
  foo,
  color,
  judyGarland,
  a: 1,
  b: 2
}

let obj3 = {
  a: 1,
  b: 2,
  foo,
  color,
  judyGarland
}

let obj4 = {
  a: 1,
  bar() {},
  b: 2,
  foo,
  color,
  judyGarland
}

var obj = {
  ...otherObj,
  prop1,    // we can't move shorthand properties as they might overwrite values in "otherObj"
  prop2,
  prop3 : value3
}
