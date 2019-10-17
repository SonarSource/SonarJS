let arr = ["a", "b", "c"];

  "1" in arr; // Noncompliant
  1 in arr; // Noncompliant
  "b" in arr; // Noncompliant


// in different contexts
const result = "car" in arr ? "something" : "someething else"; // Noncompliant
foo("car" in arr); // Noncompliant
if ("car" in arr) {} // Noncompliant


// to check the property of an object do this
"car" in { "car" : 1};
// and not this
  "car" in Object.keys({ "car": 1 }); // Noncompliant

function erroneousIncludesES2016(array: any[], elem: any) {
  return elem in array; // Noncompliant
}


const dict = {a: 1, b: 2, c: 3};
"a" in dict;  // OK on objects

function okOnArrayLikeObjects(a: any, b: any) {
  let key = "1";
  if (key in arguments) {
    return "Something";
  }
  return "Something else";
}
