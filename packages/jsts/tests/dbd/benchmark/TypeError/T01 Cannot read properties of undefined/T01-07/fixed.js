const sourceCode = {};
const cursors = {};
const TOKENS = [];
const COMMENTS = [];
const INDEX_MAP = [];
const astUtils = {};

/**
 * Check whether comments exist between the given 2 tokens.
 * @param {Token} left The left token to check.
 * @param {Token} right The right token to check.
 * @returns {boolean} `true` if comments exist between the given 2 tokens.
 */
function commentsExistBetween(left, right) {
  return sourceCode.getFirstTokenBetween(
      left,
      right,
      {
          includeComments: true,
          filter: astUtils.isCommentToken
      }
  ) !== null;
}

/**
 * Gets the first token between two non-overlapping nodes.
 * @param {ASTNode|Token|Comment} left - Node before the desired token range.
 * @param {ASTNode|Token|Comment} right - Node after the desired token range.
 * @param {number|Function|Object} [options=0] - The option object. Same options as getFirstToken()
 * @returns {Token|null} An object representing the token.
 */
sourceCode.getFirstTokenBetween = (left, right, options) => {
  return createCursorWithSkip(
      cursors.forward,
      this[TOKENS],
      this[COMMENTS],
      this[INDEX_MAP],
      left.range[1], // Noncompliant: left can be undefined
      right.range[0], // Noncompliant: right can be undefined
      options
  ).getOneToken();
}


/**
 * Gets the token that precedes a given node or token.
 * @param {ASTNode|Token|Comment} node - The AST node or token.
 * @param {number|Function|Object} [options=0] - The option object. Same options as getFirstToken()
 * @returns {Token|null} An object representing the token.
 */
sourceCode.getTokenBefore = (node, options) => {
  return createCursorWithSkip(
      cursors.backward,
      this[TOKENS],
      this[COMMENTS],
      this[INDEX_MAP],
      -1,
      node.range[0],
      options
  ).getOneToken();
}

/**
 * Gets the token that follows a given node or token.
 * @param {ASTNode|Token|Comment} node - The AST node or token.
 * @param {number|Function|Object} [options=0] - The option object. Same options as getFirstToken()
 * @returns {Token|null} An object representing the token.
 */
sourceCode.getTokenAfter = (node, options) => {
  return createCursorWithSkip(
      cursors.forward,
      this[TOKENS],
      this[COMMENTS],
      this[INDEX_MAP],
      node.range[1],
      -1,
      options
  ).getOneToken();
}

function createCursorWithSkip() {
  return {
    getOneToken: () => {
      return null;
    }
  }
}




const semiToken = {
  range: []
};
const prevToken = sourceCode.getTokenBefore(semiToken);
const nextToken = sourceCode.getTokenAfter(semiToken);

// ...

prevToken && nextToken && commentsExistBetween(prevToken, nextToken);

// ...

