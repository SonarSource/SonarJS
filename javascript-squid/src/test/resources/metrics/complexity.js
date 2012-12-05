function example() // +1 functionDeclaration
{
  if (foo) // +1 ifStatement
  {
    return 0; // +1 returnStatement
  }

  for (i = 0; i < 10; i++) // +1 iterationStatement
  {
  }

  while (false) // +1 iterationStatement
  {
  }

  switch (foo) // +0 switchStatement
  {
    case 1: // +1 caseClause
    case 2: // +1 caseClause
    default: // +0 defaultClause
    ;
  }

  try
  {
    throw "err"; // +1 throw
  }
  catch (err) // +1 catch
  {
  }

  a ? b + 1 && c - 1 : d * 1 || e / 1; // +3

  func = function(){}; // +1 functionExpression

  return 1; // +0 last returnStatement
}
