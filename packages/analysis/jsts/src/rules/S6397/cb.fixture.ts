let valid = [
  {
    regex: /a[bc]d/,
  },
  {
    regex: /[0-1]/,
  },
  {
    regex: /[^abc]/,
  },
  {
    regex: /[^a]/,
  },
  {
    regex: /[[]/,
  },
  {
    regex: /[{]/,
  },
  {
    regex: /[(]/,
  },
  {
    regex: /[.]/,
  },
  {
    regex: /[?]/,
  },
  {
    regex: /[+]/,
  },
  {
    regex: /[*]/,
  },
  {
    regex: /[$]/,
  },
  {
    regex: /[^]/,
  },
  {
    regex: /[\\]/,
  },
  {
    regex: /[$\w]/,
  },
  {
    regex: /[1-2[3]4-5]/,
  },
];

let invalid = [
  {
    regex: /a[b]d/, // Noncompliant {{Replace this character class by the character itself.}}
    //       ^^^
  },
  {
    regex: /[0]/, // Noncompliant {{Replace this character class by the character itself.}}
    //      ^^^
  },
  {
    regex: /[\w]/, // Noncompliant {{Replace this character class by the character itself.}}
    //      ^^^^
  },
  {
    regex: /[\u2028]/, // Noncompliant {{Replace this character class by the character itself.}}
    //      ^^^^^^^^
  },
  {
    regex: /[\^]/, // Noncompliant {{Replace this character class by the character itself.}}
    //      ^^^^
  },
];
