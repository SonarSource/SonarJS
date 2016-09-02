function doSomething(){                     // OK
}

function DoSomething(){                     // Noncompliant {{Rename this 'DoSomething' function to match the regular expression ^[_a-z][a-zA-Z0-9]*$}}
//       ^^^^^^^^^^^
}

function do_something(){                     // Noncompliant
}

function _doSomething(){                     // OK
}

function* doSomething(){                    // OK
}

function* DoSomething(){                    // Noncompliant
}

class C {
    doSomething(){                          // OK
    }

    DoSomething(){                          // Noncompliant
//  ^^^^^^^^^^^
    }

    * doSomething (){                       // OK
    }

    * DoSomething (){                       // Noncompliant
    }
}

var MyObj = function Object () {            // OK - not handled by the check
    this.a = 1;
};

var myObj = {

  set my_field (val) {                     // OK - not handled by the check
      this.my_field = val;
  },

  get my_field() {                         // OK - not handled by the check
    return 0;
  }

};
