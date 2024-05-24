const fs = require('node:fs');
function foo(pkgJson) {
  var fileJson = JSON.parse(fs.readFileSync(pkgJson, 'utf8')); // Noncompliant: if json is malformed
}

foo('malformed_package.json');
