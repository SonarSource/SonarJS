const fs = require('node:fs');
function foo(pkgJson) {
  try {
    var fileJson = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
  } catch (e) {
    console.log(
      'Could not read package.json file. Please check that the file contains valid JSON.',
    );
  }
}

foo('malformed_package.json');
