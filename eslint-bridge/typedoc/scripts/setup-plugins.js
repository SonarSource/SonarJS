const { execSync } = require('child_process');
const path = require('path');

setupSearchableParameters();

function setupSearchableParameters() {
  execSync('npm run setup', {
    cwd: path.join(__dirname, '..', 'searchable-parameters-plugin'),
  });
}
