let arr = []; 
arr[0] = 'a'; // OK
arr['name'] = 'bob'; // Noncompliant {{Make "arr" an object if it must have named properties; otherwise, use a numeric index here.}}
arr[1] = 'foo'; // OK
var numericVar=6;
arr[numericVar]="Yes"; // OK
var stringVar="lastname";
arr[stringVar]="Salem"; // Noncompliant {{Make "arr" an object if it must have named properties; otherwise, use a numeric index here.}}
arr[unknownVar]="OK"; // OK
var x = {}; 
x['name'] = 'John'; // OK
x=[]; // OK
var car = {
  type : "Fiat",
  model : "500",
  color : "white"
}; 
car["type"] = "BMW"; // OK
let person = new Object(); 
person.firstName = "John";
person.lastName = "Doe";
person[lastname] = "Ben"; // OK