// typedoc looks for plugins in node_modules/, therefore we create a symlink to this folder in node_modules/

const fs = require('fs');
const path = require('path');

const linkPath = path.join(__dirname, '..', '..', 'node_modules', 'searchable-parameters-plugin');
const targetPath = path.join(__dirname);

fs.symlinkSync(targetPath, linkPath);
