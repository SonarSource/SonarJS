/foo/;
/[0-9]/;
/[a-zA-Z]/;
/[foo]/;
/[\[\]]/;
/[   ]/;
/foo[]/;                    // Noncompliant {{Rework this empty character class that doesn't match anything.}}
//  ^^
/foo[]bar/;                 // Noncompliant
'foo'.match(/^foo[]/);      // Noncompliant
'foo'.search('^foo[]');     // Noncompliant
/^foo[]/.test('foo');       // Noncompliant
/^foo[]/.exec('foo');       // Noncompliant
/[]]/;                      // Noncompliant
/\[[]/;                     // Noncompliant
/\\[\\[\\]0-9[]/;           // Noncompliant
RegExp('foo[]');            // Noncompliant
new RegExp('foo[]');        // Noncompliant
