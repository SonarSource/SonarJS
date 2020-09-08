exports.rules = [
  {
    ruleId: "customrule",
    ruleModule: {
      create(context) {
        return {
          CallExpression(node) {
            console.log("detected call expression");
            context.report({
              node: node.callee,
              message: "call",
            });
          },
        };
      },
    },
    ruleConfig: [],
  },
];
