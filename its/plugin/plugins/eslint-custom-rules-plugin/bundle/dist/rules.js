exports.rules = [
  {
    ruleId: 'jsRuleKey',
    ruleModule: {
      meta: {},
      create(context) {
        console.log('Rule context options: ', context.options);
        console.log('Work dir received: ', context.settings.workDir);
        return {
          CallExpression(node) {
            console.log('detected call expression');
            context.report({
              node: node.callee,
              message: 'jsRuleKey call',
            });
          },
        };
      },
    },
    ruleConfig: [],
  },
  {
    ruleId: 'tsRuleKey',
    ruleModule: {
      create(context) {
        console.log('Rule context options: ', context.options);
        console.log('Work dir received: ', context.settings.workDir);
        return {
          CallExpression(node) {
            console.log('ts rule detected call expression');
            context.report({
              node: node.callee,
              message: 'tsRuleKey call',
            });
          },
        };
      },
    },
    ruleConfig: [],
  },
];
