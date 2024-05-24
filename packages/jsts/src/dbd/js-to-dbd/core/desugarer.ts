import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';

export type DesugaredProgramStatement =
  | Exclude<TSESTree.ProgramStatement, TSESTree.Statement>
  | DesugaredStatement;

export type DesugaredStatement =
  | Exclude<TSESTree.Statement, TSESTree.BlockStatement | TSESTree.IfStatement>
  | DesugaredBlockStatement
  | DesugaredIfStatement;

export type DesugaredIfStatement = Omit<TSESTree.IfStatement, 'alternate' | 'consequent'> & {
  alternate: DesugaredStatement;
  consequent: DesugaredStatement;
};

export type DesugaredBlockStatement = Omit<TSESTree.BlockStatement, 'body'> & {
  body: Array<DesugaredStatement>;
};

export type DesugaredNode =
  | Exclude<TSESTree.Node, TSESTree.Program | TSESTree.ProgramStatement>
  | DesugaredProgram
  | DesugaredProgramStatement;

export type DesugaredProgram = Omit<TSESTree.Program, 'body'> & {
  body: Array<DesugaredProgramStatement>;
};

/**
 * # add a noop else to every if without one
 */
export const desugar = (program: TSESTree.Program): DesugaredProgram => {
  const visit = (node: TSESTree.Node) => {
    switch (node.type) {
      case AST_NODE_TYPES.BlockStatement: {
        node.body.forEach(visit);

        break;
      }

      case AST_NODE_TYPES.IfStatement: {
        if (!node.alternate) {
          node.alternate = <TSESTree.BlockStatement>{
            body: [],
            loc: node.loc,
            parent: node.parent,
            range: node.range,
            type: AST_NODE_TYPES.BlockStatement,
          };
        }

        visit(node.test);
        visit(node.consequent);
        visit(node.alternate);

        break;
      }
    }
  };

  program.body.forEach(visit);

  return program as DesugaredProgram;
};
