/**
 * A rule definition used for testing purpose as a custom rule,
 * which highlights the injection of the global context
 */
const rule = {
  meta: {
    schema: [
      {
        title: 'sonar-context',
        type: 'object',
        properties: {
          workDir: {
            type: 'string',
          },
        },
      },
    ],
  },
  create(context) {
    const [{ workDir }] = context.options
    return {
      Literal: node => {
        context.report({
          node,
          message: `Visited '${node.value}' literal from a custom rule with injected contextual workDir '${workDir}'.`
        });
      }
    };
  },
};

export { rule };
