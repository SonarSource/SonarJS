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

  get key() {        // OK - accessor
    return this.key;
  }
}
