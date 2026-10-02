// `a` and `b` spread each other, so neither object is an ancestor of the other and the
// ancestor-based recursion check cannot see the cycle: only the path-based guard stops
// `getProperty` from recursing until the stack overflows.
const a = { ...b };
const b = { ...a };
let probe;
probe = { ...a };
