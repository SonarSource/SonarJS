const rules = require('./lib').rules;

/** @type {import('eslint-doc-generator').GenerateOptions} */
const config = {
  urlRuleDoc(name) {
    return rules[name].meta.docs.url;
  },
  postprocess: content => content.replace('<table>', '&lt;table&gt;'),
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
};

module.exports = config;
