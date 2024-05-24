'use strict';

const { KINDS, clearAST } = require('./fixed-utils.js');

/**
 * Transpile AST to SQL where clause
 *
 * @param {*} ast Abstrat syntax tree
 * @param {*} f2f Mapping field(in AST) with field(in DB or table)
 * @returns SQL where clause
 */
function transpileAST(ast, f2f) {
  let where = '';

  if (ast.kinds == KINDS.AST_LTRT) {
    let lt = transpileAST(clearAST(ast.expLt));
    let rt = transpileAST(clearAST(ast.expRt));

    where = `${lt} ${ast.andOr} ${rt}`;
  } else if (ast.kinds == KINDS.AST_FOV) {
    where = transpileFOV(clearAST(ast));
  } else if (ast.kinds == KINDS.AST_BRACKET) {
    where = '(' + transpileAST(clearAST(ast.exp)) + ')';
  }

  return where;
}

const ast = { kinds: KINDS.AST_BRACKET, exp: { kinds: KINDS.AST_LTRT, andOr: ['||'] } };
transpileAST(ast, null);
