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

var MyObj1 = function Object () {            // Noncompliant
//  ^^^^^^
    this.a = 1;
};

let MyObj2 = function Object () {            // Noncompliant
    this.a = 1;
};

var myObj = {

  Method1() { // Noncompliant

  },

  Method2: function() {                    // Noncompliant
//^^^^^^^
  },

  Method3: function * () {                    // Noncompliant
//^^^^^^^
  },

  Method4: (a, b) => { foo(a + b) },       // Noncompliant
//^^^^^^^

  ["Method5"] : function() {              // OK - not handled by the check
  },

  set my_field (val) {                     // OK - not handled by the check
      this.my_field = val;
  },

  get my_field() {                         // OK - not handled by the check
    return 0;
  }

};
