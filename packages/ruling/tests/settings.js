const path = require('path');
const rules = require('./data/rules.json');

module.exports = {
  actualPath: path.join(__dirname, 'actual', 'jsts'),
  expectedPath: path.join(
    __dirname,
    '..',
    '..',
    '..',
    'its',
    'ruling',
    'src',
    'test',
    'expected',
    'jsts',
  ),
  rules,
};
