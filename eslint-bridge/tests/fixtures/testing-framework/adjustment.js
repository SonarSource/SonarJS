// Noncompliant@+1 
alert(msg);

alert(msg); // Noncompliant {{Expected error message}}
//    ^^^
//     ^^^^^@-1< {{Secondary location message1}}
//          ^@-2< {{Secondary location message2}}
