export {};

declare function require(path: string): unknown;

const modulePath = './circle.js';
const circle = require(modulePath);
void circle;
