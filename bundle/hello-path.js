const { readFileSync } = require('fs');

const path = process.argv[2];
const content = readFileSync(path, 'utf-8');
console.log(content);
