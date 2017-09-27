// Triggers javascript:S2392
// let a, b;


// Doesn't trigger javascript:S2392
let a;
let b;


for (let i = 0; i < 3; i++) {
  if (i === 1) {
     a = true;
  }
  if (i === 2) {
     b = true;
  }
  if (a && b) {
    console.debug('same');
  }
}
