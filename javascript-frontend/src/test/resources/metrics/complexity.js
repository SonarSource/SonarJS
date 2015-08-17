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

  func = function(){ // +1 functionExpression
      if (true) // +1 ifStatement
          return 1; // +1 return statement (not last)
  };

  return 1; // +0 last returnStatement

}

class C {

    method () {  // +1 method
        var generator = function * () {  // +1 generatorExpression
        };
    }

    * generator () {  // +1 generation method
    }
}

function * generator () {  // +1 genrator declaration
}

Person.prototype = {
  whoAreYou : function() { // +1
    return this.first + ' ' + this.last; // +0
  },

  set first(first) { // +0
    this.first = first;
  },

  get first() { // +0
    return this.first; // +0
  }
};

