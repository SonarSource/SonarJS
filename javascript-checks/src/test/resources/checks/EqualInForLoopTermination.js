for (var i=0; i!=2; i+=2){ } // nok

for (i=0; i==2; i+=2){ } // nok

for (var i=0; i!=10; i+=1){ } // ok

for (var i=0; i!=10; i++){ } // ok

for (i=10; i==0; i--){ } // nok

for (var i=0; i!=10; i-=1){ } // nok

for (var i=0; i!=10; i+=1){ } // ok

for (i=10; i!=0; i++){ }  // nok

for (i=10; i!=0; i--){ }  // ok

// todo
//for (var i=0; i!=10; i+=1){  // nok
//  i++ // changes to counter -> no exception
//}

for ( i = 0; checkSet[i] != null; i++ ) {
}

for ( cur = event.target; cur != this; cur = cur.parentNode || this ) { // ok
}

for(i=from, j=0; i!=to; i+=dir, j++){} // nok