const path = require('path');
const rules = require('./data/rules.json');

module.exports = {
  actualPath: path.join(import.meta.dirname, 'actual', 'jsts'),
  expectedPath: path.join(
    import.meta.dirname,
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
