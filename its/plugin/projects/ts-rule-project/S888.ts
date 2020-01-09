for (var i=0; i>10; i+=1){ } // Compliant, not an equality in condition
for (var i=0; i!=10; i*=1){ } // Compliant, not an inc/dec update

for (i=10; i==0; i--){ } // Noncompliant
for(i=from, j=0; i!=to; i+=dir, j++){} // Noncompliant
