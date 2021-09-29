let valid = [
  {
    code: `/^(?:a|b|c)$/`,
  },
  {
    code: `/(?:^a)|b|(?:c$)/`,
  },
  {
    code: `/^abc$/`,
  },
  {
    code: `/a|b|c/`,
  },
  {
    code: `/^a$|^b$|^c$/`,
  },
  {
    code: `/^a$|b|c/`,
  },
  {
    code: `/a|b|^c$/`,
  },
  {
    code: `/^a|^b$|c$/`,
  },
  {
    code: `/^a|^b|c$/`,
  },
  {
    code: `/^a|b$|c$/`,
  },
  {
    code: `/^a|^b|c/`, // More likely intential as there are multiple anchored alternatives
  },
  {
    code: `/aa|bb|cc/`,
  },
  {
    code: `/^/`,
  },
  {
    code: `/^[abc]$/`,
  },
  {
    code: `/|/`,
  },
];


let invalid = [
  {
    code: `/^a|b|c$/`,
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
    code: `/^a|b|cd/`,
    //      ^^^^^^^
    errors: 1,
  },
  {
    code: `/a|b|c$/`,
    //      ^^^^^^^
    errors: 1,
  },
  {
    code: `/^a|(b|c)/`,
    //      ^^^^^^^
    errors: 1,
  },
  {
    code: `/(a|b)|c$/`,
    //      ^^^^^^^
    errors: 1,
  },
];
