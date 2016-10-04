var data = {
  "key": "value",
  " key": "value",
  "key": "value",      // Noncompliant [[secondary=-2]] {{Rename or remove duplicate property name 'key'.}}
//^^^^^
  'key': "value",      // Noncompliant {{Rename or remove duplicate property name 'key'.}}
  key: "value",        // Noncompliant {{Rename or remove duplicate property name 'key'.}}
//^^^
  \u006bey: "value",   // Noncompliant {{Rename or remove duplicate property name '\u006bey'.}}
  "\u006bey": "value", // Noncompliant {{Rename or remove duplicate property name '\u006bey'.}}
  "\x6bey": "value",   // Noncompliant {{Rename or remove duplicate property name '\x6bey'.}}
  "1": "value",
  1: "value",          // Noncompliant [[secondary=-1]] {{Rename or remove duplicate property name '1'.}}
//^
  key,                 // Noncompliant
//^^^

  get key() {        // Noncompliant
    return this.key;
  },

  set key(p) {      // Noncompliant
  },

  key() {},  // Noncompliant
  ["computedProperty"] : 1
}

class A {
  prop;
  prop1;
  ;
  prop = 1;        // Noncompliant
  static prop = 1; // Noncompliant
  prop() {}        // Noncompliant
  * prop() {}      // Noncompliant
  set prop(p) {}   // Noncompliant
  get prop() {}    // Noncompliant

  set prop2(p) {}
  prop2;           // Noncompliant

  get prop3() {}
  prop3;            // Noncompliant

  get prop4() {}
  set prop4(p) {}    // OK

  set prop5(p) {}    // OK
  get prop5() {}
}
