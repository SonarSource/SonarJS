let arr = []; 
arr[0] = 'a'; // OK
arr['name'] = 'bob'; // Noncompliant {{Make "arr" an object if it must have named properties; otherwise, use a numeric index here.}}
arr[1] = 'foo'; // OK
arr[lastname] = "Ben"; //  Noncompliant {{Make "arr" an object if it must have named properties; otherwise, use a numeric index here.}}
var x = {}; 
x['name'] = 'John'; // OK
x=[]; // OK
let car = {
  type : "Fiat",
  model : "500",
  color : "white"
}; 
car[type] = "BMW"; // OK
let person = new Object(); 
person.firstName = "John";
person.lastName = "Doe";
person[lastname] = "Ben"; // OK