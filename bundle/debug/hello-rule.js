const { readFileSync } = require('fs');
const eslint = require('eslint');

const path = process.argv[2];
const content = readFileSync(path, 'utf-8');
//console.log('read ', content);

const { rules } = require(path);
const [rule] = rules;

const linter = new eslint.Linter();
linter.defineRule(rule.ruleId, rule.ruleModule);

// const sourceCode = "foo;";

const sourceCode = `
var express = require('express');
var app = express();

app.all('/', function (req, res) {
    res.redirect(req.query.url);                // Noncompliant (S5146)
    res.redirect("safe");                       // Compliant
});
`;

const ruleId = 'ucfg';
const config = { [rule.ruleId]: 'error' };

const [message] = linter.verify(sourceCode, { rules: config });
console.log('got msg', message);
