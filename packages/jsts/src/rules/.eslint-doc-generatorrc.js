/** @type {import('eslint-doc-generator').GenerateOptions} */
const rules = require('eslint-plugin-sonarjs').rules;

const config = {
  urlRuleDoc(name) {
    return rules[name].meta.docs.url;
  },
  postprocess: content => content.replace('<table>', '&lt;table&gt;'),
  ignoreConfig: ['recommended-legacy'],
};

module.exports = config;
