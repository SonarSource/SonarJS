export const rules = [
  {
    ruleId: 'customrule',
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
              message: 'call',
            });
          },
        };
      },
    },
    ruleConfig: [],
  },
  {
    ruleId: 'tsrule',
    ruleModule: {
      create(context) {
        return {
          CallExpression(node) {
            console.log('ts rule detected call expression');
            context.report({
              node: node.callee,
              message: 'tsrule call',
            });
          },
        };
      },
    },
    ruleConfig: [],
  },
];
