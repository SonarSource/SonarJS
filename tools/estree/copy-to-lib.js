const fs = require('node:fs');
const path = require('node:path');

fs.copyFileSync(
  path.join(__dirname, 'output', 'estree.proto'),
  path.join(__dirname, '..', '..', 'lib', 'jsts', 'src', 'parsers', 'estree.proto'),
);
fs.copyFileSync(
  path.join(__dirname, 'output', 'estree.proto'),
  path.join(__dirname, '..', '..', 'packages', 'jsts', 'src', 'parsers', 'estree.proto'),
);
