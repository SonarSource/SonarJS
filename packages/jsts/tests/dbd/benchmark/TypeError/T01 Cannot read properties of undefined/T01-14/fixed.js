function containsAssignment(node) {
  if (node.type === "AssignmentExpression") {
    return true;
  } else {
    /* ... */
  }
  return false;
}

function isReturnAssignException(node) {
  if (node.type === "ReturnStatement") {
    return node.argument && containsAssignment(node.argument);
  }
  return false;
}

const retStmt = { type: 'ReturnStatement' };
isReturnAssignException(retStmt);
