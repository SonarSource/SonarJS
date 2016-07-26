function example() // +1 functionDeclaration
{
  var arrow_func = () => { // +0 nested function
    foo(1 && 2);
    return 42;
  };
  var arrow_func2 = () => 42; // +0 nested function

  if (foo) // +1 ifStatement
  {
    return 0; // +1 returnStatement
  }

  for (i = 0; i < 10; i++) // +1 iterationStatement
  {
  }
  
  for (e in x) { // +1 for...in
  }

  for (e of x) { // +1 for...of
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

  func = function(){  // +0 nested function
      if (true)
          return 1;
  };
  
  do { // +1 do...while
  } while(false);

  return 1; // +0 last returnStatement
}

class C {

    method () {  // +1 method
        var generator = function * () {  // +0 nested function
        };
    }

    * generator () {  // +1 generation method
    }
}

function * generator () {  // +1 generator declaration
}

Person.prototype = {
  whoAreYou : function() { // +1
    return this.first + ' ' + this.last; // +0
  },

  set first(first) { // +1
    this.first = first;
  },

  get first() { // +1
    if (cond) { // +1
    }
    return this.first; // +0
  }
};
