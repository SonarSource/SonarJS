let valid = [
    {
        code: /a[bc]d/,
    },
    {
        code: /[0-1]/,
    },
    {
        code: /[^abc]/,
    },
    {
        code: /[^a]/,
    },
    {
        code: /[[]/,
    },
    {
        code: /[{]/,
    },
    {
        code: /[(]/,
    },
    {
        code: /[.]/,
    },
    {
        code: /[?]/,
    },
    {
        code: /[+]/,
    },
    {
        code: /[*]/,
    },
    {
        code: /[$]/,
    },
    {
        code: /[^]/,
    },
    {
        code: /[\\]/,
    },
    {
        code: /[$\w]/,
    },
    { 
        code: /[1-2[3]4-5]/,
    },
];
  
let invalid = [
    {
        code: /a[b]d/, // Noncompliant {{Replace this character class by the character itself.}}
        //      ^^^
    },
    {
        code: /[0]/, // Noncompliant
        //     ^^^
    },
    {
        code: /[\w]/, // Noncompliant
        //     ^^^^
    },
    {
        code: /[\u2028]/, // Noncompliant
        //     ^^^^^^^^
    },
];

  