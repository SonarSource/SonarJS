function containsAssignment(node) {
  if (node.type === "AssignmentExpression") { // Noncompliant: node can be undefined
    return true;
  } else {
    /* ... */
  }
  return false;
}

function isReturnAssignException(node) {
  if (node.type === "ReturnStatement") {
    return containsAssignment(node.argument); // Noncompliant
  }
  return false;
}

const retStmt = { type: 'ReturnStatement' };
isReturnAssignException(retStmt);
