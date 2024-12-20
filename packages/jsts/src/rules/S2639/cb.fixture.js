/foo/;
/[0-9]/;
/[a-zA-Z]/;
/[foo]/;
/[\[\]]/;
/[   ]/;
/[^]/;
/foo[]/;                    // Noncompliant {{Rework this empty character class that doesn't match anything.}}
//  ^^
/foo[]bar/;                 // Noncompliant {{Rework this empty character class that doesn't match anything.}}
'foo'.match(/^foo[]/);      // Noncompliant {{Rework this empty character class that doesn't match anything.}}
'foo'.search('^foo[]');     // Noncompliant {{Rework this empty character class that doesn't match anything.}}
/^foo[]/.test('foo');       // Noncompliant {{Rework this empty character class that doesn't match anything.}}
/^foo[]/.exec('foo');       // Noncompliant {{Rework this empty character class that doesn't match anything.}}
/[]]/;                      // Noncompliant {{Rework this empty character class that doesn't match anything.}}
/\[[]/;                     // Noncompliant {{Rework this empty character class that doesn't match anything.}}
/\\[\\[\\]0-9[]/;           // Noncompliant {{Rework this empty character class that doesn't match anything.}}
RegExp('foo[]');            // Noncompliant {{Rework this empty character class that doesn't match anything.}}
new RegExp('foo[]');        // Noncompliant {{Rework this empty character class that doesn't match anything.}}
