// JavaScript

function gcd(x, y) {
  // Implementation of greatest common divisor
}

let x = 92;
let y = 34;
let z = gcd(x, y);
console.assert(z === 2);

class Rational {
  constructor(nom, denom) {
    this.nom = nom;
    this.denom = denom;
  }
}

let rational = new Rational(x, y);

function simplify(rational) {
  let d = gcd(rational.nom, rational.denom);
  return new Rational(rational.nom / d, rational.denom / d);
}

let simplified = simplify(rational);
console.assert(gcd(simplified.denom, simplified.nom) === 1);
