function compliant() {

  for (var i=0; i>10; i+=1){ } // Compliant, not an equality in condition
  for (var i=0; i!=10; i*=1){ } // Compliant, not an inc/dec update

  for (var i=0; i!=10; i++){ } // Compliant, trivial update operation increasing from 0 to 10
  for (var i=10; i!=0; i--){ } // Compliant, trivial update operation decreasing from 10 to 0
  for (var i=0; i!=10; i+=1){ } // Compliant, trivial update operation
  for (var i=10; i!=0; i-=1){ } // Compliant, trivial update operation
  for (var i=10; i!==0; i-=1){ } // Compliant, trivial update operation

  var j = 20;
  for (j=0; j!=10; j++){ } // Compliant, trivial update operation

  //Compliant tests: non trivial condition exception
  for (i = 0; checkSet[i] != null; i++){ }
  for (i = 0, k = 0; j != null; i++, k--){ } // Non trivial, j is not updated
  for (; checkSet[i] != null; i++ ){ }
  for (i = 0; foo(i) == 42; i++){ }
  for ( cur = event.target; cur != this; cur = cur.parentNode || this ){ }

  for (var i=0;; i+=1){ } // Compliant, no condition
  for (var i=0; i!=10;){ } // Compliant, no update
  for (var i=0; i>=10;){ } // Compliant, no update

}

function non_compliant() {
  for (var i=0; i!=2; i+=2){ } // Noncompliant {{Replace '!=' operator with one of '<=', '>=', '<', or '>' comparison operators.}}
//              ^^^^
  for (i=0; i==2; i+=2){ }  // Noncompliant {{Replace '==' operator with one of '<=', '>=', '<', or '>' comparison operators.}}
//          ^^^^
  for (i=10; i==0; i--){ } // Noncompliant
  for (var i=0; i===10; i++){ } // Noncompliant
//              ^^^^^^

  for(i=from, j=0; i!=to; i+=dir, j++){} // Noncompliant

  //even if trivial update operation, we have equality in condition

  //not a trivial update
  for (var i=0; i!==2; i+=2){ } // Noncompliant
//              ^^^^^

  //trivial update, but init is higher than stop and update is increasing
  for (var i=10; i!=0; i++){ } // Noncompliant

  //trivial update, but init is lower than stop and update is decreasing
  for (var i=0; i!=10; i-=1){ } // Noncompliant

  //trivial update operation with wrong init
  for (var i="a"; i!=0; i-=1){ } // Noncompliant

  //trivial update, but init is lower than stop
  var j = 20;
  for (j=0; j!=10; j--){ } // Noncompliant

  //not a non-trivial condition exception, updated counter is not in the condition
  for (i = 0, k = 0; k != null; i++, k--){ } // Noncompliant

  for (var i=0; i!=10; i+=1){ // Noncompliant
    i++ // changes to counter -> no exception
  }

  var iii = 0;
  for (var i=0; iii!=10; iii+=1){ // Noncompliant
    iii++ // changes to counter -> no exception
  }
}
