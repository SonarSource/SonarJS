function S3776(foo) {
  if (foo.bar) {
    if (foo.baz) {
      if (foo.qux) {
        if (foo.fred) {
          if (foo.thud) {
            if (foo.abc) {
              foo.bcd();
            }
          }
        }
      }
    }
  }
}

function S2703(foo) {
  if (x == 0) {
    x = 42;
  }
}

function S2376() {
  class C {
    set m(a) {
      this.a = a;
    }
  }
}

function doSomething() {
  doSmth();
}
switch (x) {
  case 0:
    doSomething();
  case 1:
    doSomething();
  default:
    doSomethingElse();
}

/*

function S125() {
  class C {
    set m(a) {
      this.a = a;
    }
  }
}

 */

// if (something) {}
import { useEffect, useState } from 'react';

function Form() {
  const [name, setName] = useState('Mary');
  if (name !== '') {
    useEffect(function persistForm() {
      // Noncompliant {{React Hook "useEffect" is called conditionally. React Hooks must be called in the exact same order in every component render.}}
      //  ^^^^^^^^^
      console.log('persistForm');
    });
  }
  return 1;
}

enum LogType {
  LOG,
  ERROR,
  WARN,
}
