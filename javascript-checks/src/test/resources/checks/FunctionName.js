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

var MyObj = function Object () {            // OK - not handle by the check
    this.a = 1;
};

var myObj = {

  set my_field (val) {                     // OK - not handle by the check
      this.my_field = val;
  }

};
