var a = {
  get p1() { // Noncompliant {{Provide a setter matching this getter for 'p1'.}}
//^^^^^^
    return 42;
  },

  set p2(value) { // Noncompliant {{Provide a getter matching this setter for 'p2'.}}
//^^^^^^
    foo(value);
  },

  get p3() { return 42; },
  set p3(value) { foo(value);  },

  nested() {
    return {
      get p3() {return 42;} // Noncompliant
    }
  }
}

class A {
  get p1() { // Noncompliant
    return 42;
  }

  set p2(value) { // Noncompliant
    foo(value);
  }

  get p3() { return 42; }
  set p3(value) { foo(value);  }

  nested() {
   return {
     get p3() {return 42;} // Noncompliant
   }
  }
}

