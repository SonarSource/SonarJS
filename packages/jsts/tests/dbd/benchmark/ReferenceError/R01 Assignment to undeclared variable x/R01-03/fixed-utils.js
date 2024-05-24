'use strict';

/** Definition of AST kinds */
const KINDS = {
  /** AST of Field Operator Value type, i.e. 'field = 10' */
  AST_FOV: 0,
  /** AST contains two expressions 'left expression' AND(OR) 'right expression' */
  AST_LTRT: 1,
  /** AST Bracket type '(' expression ')' */
  AST_BRACKET: 2,
};

function myJoin(mightBeArray) {
  return _myJoin(mightBeArray);
}

function _myJoin(mightBeArray) {
  let str = '';

  if (Array.isArray(mightBeArray)) {
    for (const element of mightBeArray) {
      if (Array.isArray(element)) {
        str += myJoin(element);
      } else {
        str += element;
      }
    }
  } else {
    str += mightBeArray;
  }

  return str;
}

/**
 * Clear AST,
 *
 * AST (parsed by nearley) contains field or value as array or comma separated character.
 * So, this fucntion concates them as string
 *
 * @param {*} ast
 * @returns AST continas field or value as string
 */
function clearAST(ast) {
  ast.cleaned = {};

  if (ast.kinds == KINDS.AST_LTRT) {
    if (Array.isArray(ast.andOr)) {
      ast.cleaned.andOr = myJoin(ast.andOr);
      ast.cleaned.andOr = ast.cleaned.andOr.trim();
    }
  }

  return ast;
}

module.exports = { KINDS, clearAST, myJoin };
