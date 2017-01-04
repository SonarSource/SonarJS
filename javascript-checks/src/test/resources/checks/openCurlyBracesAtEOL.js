class ANiceClass
extends ASimpleClass {                              // OK
}

class ASimpleClass
{                                           // Noncompliant
}

class AGreatClass
extends ASimpleClass
{}                                          // Noncompliant

function declaredFunction() {               // OK
}

function declaredFunctionKo()
  {                                         // Noncompliant {{Move this open curly brace to the end of the previous line.}}
//^
}

function declaredFunctionKoBodyOnSameLine()
  {}                                        // Noncompliant
//^

function* generatorFunction() {}            // OK

function* generatorFunction()
{                                           // Noncompliant
}

var functionExpression = function() {       // OK
};

var functionExpressionKo = function()
{                                           // Noncompliant
};

(function() {                               // OK
    doSomethingHidden();
})();

(function()
    {                                       // Noncompliant
        doSomethingHidden();
})();

functionWithArrow(cucumber => {             // OK

});

functionWithArrow(cucumber =>
  {                                         // Noncompliant
//^
});

if(true) {                                  // OK
} else {                                    // OK
}

if(true)
{                                           // Noncompliant
} else
{                                           // Noncompliant
}

while(false) {                              // OK
}

while(false)
{                                           // Noncompliant
}

do {                                        // OK
} while (false)

do
{                                           // Noncompliant
} while (false)

for(var i = 0; i < 10; i++) {               // OK
}

for(var i = 0; i < 10; i++)
{                                           // Noncompliant
}

for(let key in anObject)
{                                           // Noncompliant
}

for(let value of anArray)
{                                           // Noncompliant
}

try {                                       // OK
} finally {                                 // OK
}

try {                                       // OK
} catch (e) {                               // OK
}

try {                                       // OK
} catch (e) {                               // OK
} finally {                                 // OK
}

try
{                                           // Noncompliant
} catch (e)
{                                           // Noncompliant
} finally
{                                           // Noncompliant
}

with (Array) {                              // OK
}

with (Blob)
{}                                          // Noncompliant

switch (a) {                                // OK
    case 3:
        doStuff();
        break;
    default :
        break;
}

switch (a)
{                                           // Noncompliant
    case 7:
        doOtherStuff();
        break;
    default :
        break;
}

var a = {                                   // OK
            b : "ok"
        };

var c =
{                                           // Noncompliant
    d : "ko"
};

functionWithObject({                        // OK
    e : "ok"
});

functionWithObject(
   {                                        // Noncompliant
        f: "ko"
});

functionWithObjects(parameter1,             // OK
   {                                        // OK
        g: "someValue2"
   }
);