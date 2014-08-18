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
