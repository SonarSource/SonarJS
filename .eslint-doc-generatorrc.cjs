const rules = require('./lib').rules;
const prettier = require('prettier');
const { prettier: prettierOpts } = require('./package.json');

/** @type {import('eslint-doc-generator').GenerateOptions} */
const config = {
  urlRuleDoc(name) {
    return rules[name].meta.docs.url;
  },
  ignoreConfig: ['recommended-legacy'],
  pathRuleDoc(name) {
    return `docs/${name}.md`;
  },
  pathRuleList: '../packages/jsts/src/rules/README.md',
  ruleListColumns: [
    'name',
    'description',
    'configsError',
    'fixable',
    'hasSuggestions',
    'requiresTypeChecking',
    'deprecated',
  ],
  postprocess: content =>
    prettier.format(content.replace('<table>', '&lt;table&gt;'), {
      ...prettierOpts,
      parser: 'markdown',
    }),
};

module.exports = config;
