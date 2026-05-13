/* eslint prefer-const: 2 */
let first, second;
[first, second] = [1, 2];
first = 3;
console.log(second);
