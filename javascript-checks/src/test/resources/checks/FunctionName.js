function doSomething(){                     // OK
}

function DoSomething(){                     // NOK
}

function* doSomething(){                    // OK
}

function* DoSomething(){                    // NOK
}

class C {
    doSomething(){                          // OK
    }

    DoSomething(){                          // NOK
    }

    * doSomething (){                       // OK
    }

    * DoSomething (){                       // NOK
    }
}

var doSomething = function() { };           // OK

var DoSomething = function() { };           // NOK

var doSomething = (function() { });         // OK

var DoSomething = (function() { });         // NOK

var doSomething = (Math.random() === 0 ? function () { } : function () { }); // OK

var DoSomething = (Math.random() === 0 ? function () { } : function () { }); // NOK

var obj = {
    doSomething : function () { },          // OK

    DoSomething : function () { },          // NOK

    doSomething : function* () { },         // OK

    DoSomething : function* () { },         // NOK

    doSomething : (function () { }),        // OK

    DoSomething : (function () { }),        // NOK

    doSomething : (Math.random() === 0 ? function () { } : function () { }), // OK

    DoSomething : (Math.random() === 0 ? function () { } : function () { }),  // NOK
    
    doSomething : (Math.random() === 0 ? function* () { } : function* () { }), // OK

    DoSomething : (Math.random() === 0 ? function* () { } : function* () { })  // NOK
}

var obj = $(':button').bind('click', function () { }); // OK

var Obj = $(':button').bind('click', function () { }); // OK

var obj = undefined || function () { };     // OK

var Obj = undefined || function () { };     // NOK

var obj = undefined || function* () { };    // OK

var Obj = undefined || function* () { };    // NOK

var obj = {
    doSomething : function () { 
        var a = $(':button').bind('click', function () { }); // OK
        var A = $(':button').bind('click', function () { }); // OK
        var b = $(':button').bind('click', function* () { }); // OK
        var B = $(':button').bind('click', function* () { }); // OK
    } // OK
}

var obj = 
    undefined || function () { };           // OK
    
var Obj = 
    undefined || function () { };           // NOK (violation at previous line)