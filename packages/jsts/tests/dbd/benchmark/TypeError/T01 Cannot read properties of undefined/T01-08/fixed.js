const sourceCode = {};

const tokens = [undefined];
const starts = [1]
const node = {
  range: [0]
}

/**
 * Gets the token that precedes a given node or token in the token stream.
 * @param {(ASTNode|Token)} node The AST node or token.
 * @param {int} [skip=0] A number of tokens to skip before the given node or
 *     token.
 * @returns {Token} An object representing the token.
 */
sourceCode.getTokenBefore = function(node, skip) {
  return tokens[starts[node.range[0]] - (skip || 0) - 1];
};

function lastTokenIndex() {
  return 0;
}

/**
 * Gets the token that follows a given node or token in the token stream.
 * @param {(ASTNode|Token)} node The AST node or token.
 * @param {int} [skip=0] A number of tokens to skip after the given node or
 *     token.
 * @returns {Token} An object representing the token.
 */
sourceCode.getTokenAfter = function(node, skip) {
  return tokens[lastTokenIndex(node) + (skip || 0) + 1];
};

/**
 * Checks whether or not a node is enclosed in parentheses.
 * @param {Node|null} node - A node to check.
 * @param {sourceCode} sourceCode - The ESLint SourceCode object.
 * @returns {boolean} Whether or not the node is enclosed in parentheses.
 */
function isEnclosedInParens(node, sourceCode) {
  var prevToken = sourceCode.getTokenBefore(node);
  var nextToken = sourceCode.getTokenAfter(node);

  return prevToken && prevToken.value === "(" && nextToken && nextToken.value === ")";
}

isEnclosedInParens(node, sourceCode);
