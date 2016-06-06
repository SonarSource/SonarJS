let obj1 = {  // Noncompliant {{Group all shorthand properties at either the beginning or end of this object declaration.}}  [[secondary=+1,+3,+5]]
  foo,
  a: 1,
  color,
  b: 2,
  judyGarland
}

let obj5 = {  // Noncompliant {{Group all shorthand properties at the beginning of this object declaration}}  [[secondary=+4,+6]]
  foo,
  color,
  a: 1,
  c,
  b: 2,
  judyGarland
}

let obj6 = {  // Noncompliant {{Group all shorthand properties at the end of this object declaration}}  [[secondary=+2,+3]]
  a: 1,
  foo,
  color,
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
