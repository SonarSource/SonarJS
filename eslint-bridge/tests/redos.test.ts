import safeRegex from 'safe-regex';

describe('safe regex', () => {
  it('1', () => {
    toReport(/(.*-)*@.*/);
  });

  it('2', () => {
    toReport(/(?:(?:"|'|\]|\}|\\|\d|(?:nan|infinity|true|false|null|undefined|symbol|math)|\`|\-|\+)+[)]*;?((?:\s|-|~|!|\{\}|\|\||\+)*.*(?:.*=.*)))/);
  });

  it('3', () => {
    toReport(/^[\s\u200c]+|[\s\u200c]+$/);
  });

  it('4', () => {
    toReport("(.*,)*");
  });

  it('5', () => {
    toReport("(.*,)*?");
  });

  it('6', () => {
    toReport("(.?,)*?");
  });

  it('7', () => {
    toReport("(a|.a)*?");
  });

  it('8', () => {
    toReport("(?:.*,)*(X)\\1");
  });

  it('9', () => {
    toReport("(.*,)*\\1");
  });

  it('10', () => {
    toReport("(.*,)*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("(.*,)*.*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("(.*,)*X"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("(.*,)*X"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("(.*?,)+"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("(.*?,){5,}"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("((.*,)*)*+"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("((.*,)*)?"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("(?>(.*,)*)"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("((?>.*,)*)*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("(.*,)* (.*,)*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("(.*,)*$"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("(.*,)*$"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("(.*,)*(..)*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("(.*,)*(.{2})*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
  });

  it.only('11', () => {
    // Always polynomial when two non-possessive quantifiers overlap in a sequence
    toReport("x*\\w*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport(".*.*X"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("x*a*x*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toNotReport("x*,a*x*"); // Compliant, can fail between the two quantifiers
    toReport("x*(xy?)*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("(ab)*a(ba)*"); // False Negative :-(
    toReport("x*xx*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toNotReport("x*yx*"); // Compliant
    toReport("x*a*b*c*d*e*f*g*h*i*x*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("x*a*b*c*d*e*f*g*h*i*j*x*"); // FN because we forget about the first x* when the maximum number of tracked repetitions is exceeded
    toReport("x*a*b*c*d*e*f*g*h*i*j*x*x*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    // Non-possessive followed by possessive quantifier is actually polynomial
    toReport(".*\\s*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport(".*\\s*+"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toNotReport(".*+\\s*"); // Compliant, other way (possessive then non-possessive) is fine
    toNotReport(".*+\\s*+"); // Compliant, two possessives is fine
    toNotReport(".*,\\s*+,"); // Compliant, can fail between the two quantifiers
    toReport("\\s*\\s*+,"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toNotReport("a*\\s*+,"); // Compliant, no overlap
    toReport("[a\\s]*\\s*+,"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("[a\\s]*b*\\s*+,"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toNotReport("\\s*+[a\\s]*b*,"); // Compliant, possessive then non-possessive
    toNotReport("\\s*+b*[a\\s]*,"); // Compliant, possessive then non-possessive
    // Implicit reluctant quantifier in partial match also leads to polynomial runtime
    toReport("\\s*,"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("\\s*+,"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("(?s:.*)\\s*,(?s:.*)"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toReport("(?s:.*)\\s*+,(?s:.*)"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
    toNotReport(",\\s*+"); // Compliant
    toNotReport(",\\s*+,"); // Compliant
    toNotReport("\\s*+"); // Compliant
  });


});

function toReport(re) {
  console.log(`${re}: expected false, got ${safeRegex(re)}`);
}

function toNotReport(re) {
  console.log(`${re}: expected true, got ${safeRegex(re)}`);
}
// function toReport(re) {
//   expect(safeRegex(re)).toBeFalsy();
// }

// function toNotReport(re) {
//   expect(safeRegex(re)).toBeTruthy();
// }


//   void alwaysQuadratic(String str) {
//     // Always polynomial when two non-possessive quantifiers overlap in a sequence
//     str.matches("x*\\w*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     str.matches(".*.*X"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     str.matches("x*a*x*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     str.matches("x*,a*x*"); // Compliant, can fail between the two quantifiers
//     str.matches("x*(xy?)*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     str.matches("(ab)*a(ba)*"); // False Negative :-(
//     str.matches("x*xx*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     str.matches("x*yx*"); // Compliant
//     str.matches("x*a*b*c*d*e*f*g*h*i*x*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     str.matches("x*a*b*c*d*e*f*g*h*i*j*x*"); // FN because we forget about the first x* when the maximum number of tracked repetitions is exceeded
//     str.matches("x*a*b*c*d*e*f*g*h*i*j*x*x*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     // Non-possessive followed by possessive quantifier is actually polynomial
//     str.matches(".*\\s*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     str.matches(".*\\s*+"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     str.matches(".*+\\s*"); // Compliant, other way (possessive then non-possessive) is fine
//     str.matches(".*+\\s*+"); // Compliant, two possessives is fine
//     str.matches(".*,\\s*+,"); // Compliant, can fail between the two quantifiers
//     str.matches("\\s*\\s*+,"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     str.matches("a*\\s*+,"); // Compliant, no overlap
//     str.matches("[a\\s]*\\s*+,"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     str.matches("[a\\s]*b*\\s*+,"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     str.matches("\\s*+[a\\s]*b*,"); // Compliant, possessive then non-possessive
//     str.matches("\\s*+b*[a\\s]*,"); // Compliant, possessive then non-possessive
//     // Implicit reluctant quantifier in partial match also leads to polynomial runtime
//     str.split("\\s*,"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     str.split("\\s*+,"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     str.matches("(?s:.*)\\s*,(?s:.*)"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     str.matches("(?s:.*)\\s*+,(?s:.*)"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     str.split(",\\s*+"); // Compliant
//     str.split(",\\s*+,"); // Compliant
//     str.split("\\s*+"); // Compliant
//   }

//   void differentPolynomials(String str) {
//     // quadratic (O(n^2))
//     str.matches("x*x*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     // cubic (O(n^3))
//     str.matches("x*x*x*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     // O(n^4)
//     str.matches("x*x*x*x*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     // O(n^5)
//     str.matches("x*x*x*x*x*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//     // cubic
//     str.matches("[^=]*.*.*=.*"); // Noncompliant {{Make sure the regex used here, which is vulnerable to polynomial runtime due to backtracking, cannot lead to denial of service.}}
//   }

//   void fixedInJava9(String str) {
//     str.matches("(.?,)*X");
//   }

//   void notFixedInJava9(String str) {
//     // The back reference prevents the Java 9+ optimization from being applied
//     str.matches("(.?,)*\\1"); // Noncompliant {{Make sure the regex used here, which is vulnerable to exponential runtime due to backtracking, cannot lead to denial of service.}}
//     str.matches("(?:(.?)\\1,)*"); // FN because RegexTreeHelpers.intersects can't currently handle backreferences inside the repetition
//   }

//   void compliant(String str) {
//     str.split("(.*,)*");
//     str.matches("(?s)(.*,)*.*");
//     str.matches("(.*,)*(?s:.)*");
//     str.matches("(?s)(.*,)*(.?)*");
//     str.matches("(a|b)*");
//     str.matches("(x*,){1,5}X");
//     str.matches("((a|.a),)*");
//     str.matches("(.*,)*[\\s\\S]*");
//     str.matches("(?U)(.*,)*(.|\\s)*");
//     str.matches("(x?,)?");
//     str.matches("(?>.*,)*");
//     str.matches("([^,]*+,)*");
//     str.matches("(.*?,){5}");
//     str.matches("(.*?,){1,5}");
//     str.matches("([^,]*,)*");
//     str.matches("(;?,)*");
//     str.matches("(;*,)*");
//     str.matches("x*|x*");
//     str.matches("a*b*");
//     str.matches("a*a?b*");
//     str.matches("a*(a?b)*");
//     str.matches("a*(ab)*");
//     str.split("x*x*");
//     str.matches("(?s)x*.*");
//     str.matches("x*(?s)*"); // Coverage
//     str.matches("(.*,)*("); // Rule is not applied to syntactically invalid regular expressions
//   }

// }
