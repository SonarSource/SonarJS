function sayHello() {
// Noncompliant@+1 {{Use string concatenation rather than line continuation.}}
  nok = 'A rather long string of English text, an error message \
         actually that just keeps going and going -- an error \
         message to make the Energizer bunny blush (right through \
         those Schwarzenegger shades)! Where was I? Oh yes, \
         you\'ve got an error and all the extraneous whitespace is \
        just gravy.  Have a nice day.';
  ok = 'ok';
}
