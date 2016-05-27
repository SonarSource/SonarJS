  parseInt("1O");            // Noncompliant {{Add the base to this "parseInt" call.}}
//^^^^^^^^
myObject.parserInt("10");  // OK
parseInt("10", 10);        // OK
parseFloat("10F");         // OK
