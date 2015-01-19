var data = {
  "key": "value",
  " key": "value",
  "1": "value",
  "key": "value",      // NOK - duplicate of "key"
  'key': "value",      // NOK - duplicate of "key"
  key: "value",        // NOK - duplicate of "key"
  \u006bey: "value",   // NOK - duplicate of "key"
  "\u006bey": "value", // NOK - duplicate of "key"
  "\x6bey": "value",   // NOK - duplicate of "key"
  1: "value",          // NOK - duplicate of "1"
  key,                 // NOK - duplicate of "key"

  get key() {        // OK - accessor
    return this.key;
  }
}
