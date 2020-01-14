x = 7;

function doTheThing() { }
function doTheOtherThing() { }

if (x == 5) // Noncompliant
doTheThing();
else if (x == 6) // Noncompliant
doTheThing();
else // Noncompliant
doTheThing();
