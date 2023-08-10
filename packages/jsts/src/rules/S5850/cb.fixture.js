let valid = [
  {
    regex: /^(?:a|b|c)$/,
  },
  {
    regex: /(?:^a)|b|(?:c$)/,
  },
  {
    regex: /^abc$/,
  },
  {
    regex: /a|b|c/,
  },
  {
    regex: /^a$|^b$|^c$/,
  },
  {
    regex: /^a$|b|c/,
  },
  {
    regex: /a|b|^c$/,
  },
  {
    regex: /^a|^b$|c$/,
  },
  {
    regex: /^a|^b|c$/,
  },
  {
    regex: /^a|b$|c$/,
  },
  {
    regex: /^a|^b|c/, // More likely intentional as there are multiple anchored alternatives
  },
  {
    regex: /aa|bb|cc/,
  },
  {
    regex: /^/,
  },
  {
    regex: /^[abc]$/,
  },
  {
    regex: /|/,
  },
];


let invalid = [
  {
    regex: /^a|b|c$/,    // Noncompliant {{Group parts of the regex together to make the intended operator precedence explicit.}}
    //      ^^^^^^^
    errors: [
      {
        message:
          'Group parts of the regex together to make the intended operator precedence explicit.',
        line: 1,
        endLine: 1,
        column: 2,
        endColumn: 9,
      },
    ],
  },
  {
    regex: /^a|b|cd/,    // Noncompliant
    //      ^^^^^^^
    errors: 1,
  },
  {
    regex: /a|b|c$/,   // Noncompliant
    //      ^^^^^^
    errors: 1,
  },
  {
    regex: /^a|(b|c)/,   // Noncompliant
    //      ^^^^^^^^
    errors: 1,
  },
  {
    regex: /(a|b)|c$/,   // Noncompliant
    //      ^^^^^^^^
    errors: 1,
  },
];
