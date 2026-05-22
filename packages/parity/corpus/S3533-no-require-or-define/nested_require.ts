export {};

declare function require(path: string): unknown;

const cond = true;
if (cond) {
  require('./circle.js');
}
