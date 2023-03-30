var arrayOfNumbers = [80, 3, 9, 34, 23, 5, 1];
arrayOfNumbers.sort(); // Noncompliant

arrayOfNumbers.sort((n, m) => n - m);

sort();

function getArrayOfNumbers(): number[] {}
getArrayOfNumbers().sort(); // Noncompliant

var arrayOfStrings = ["foo", "bar"];
arrayOfStrings.sort(); // Noncompliant

var arrayOfObjects = [{a: 2}, {a: 4}];
arrayOfObjects.sort(); // Noncompliant

unknownArrayType.sort();

interface MyCustomNumber extends Number {}
const arrayOfCustomNumbers: MyCustomNumber[];
arrayOfCustomNumbers.sort(); // Noncompliant
