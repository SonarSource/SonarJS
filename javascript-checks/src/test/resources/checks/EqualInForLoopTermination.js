for (var i=0; i!=2; i+=2){ } // Noncompliant {{Replace '!=' operator with one of '<=', '>=', '<', or '>' comparison operators.}}
//             ^^

for (i=0; i==2; i+=2){ } // Noncompliant

for (var i=0; i!=10; i+=1){ } // ok

for (var i=0; i!=10; i++){ } // ok

for (i=10; i==0; i--){ } // Noncompliant

for (var i=0; i!=10; i-=1){ } // Noncompliant

for (var i=0; i!=10; i+=1){ } // ok

for (i=10; i!=0; i++){ }  // Noncompliant

for (i=10; i!=0; i--){ }  // ok

for (var i=0; i!=10; i+=1){  // FN, Noncompliant
  i++ // changes to counter -> no exception
}

for ( i = 0; checkSet[i] != null; i++ ) { // ok
}

for ( cur = event.target; cur != this; cur = cur.parentNode || this ) { // ok
}

for(i=from, j=0; i!=to; i+=dir, j++){} // Noncompliant

for (; checkSet[i] != null; i++ ) { // ok
}

for (i = 0; foo(i) == 42; i++) {} // ok
