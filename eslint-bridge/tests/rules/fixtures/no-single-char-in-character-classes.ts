let valid = [
    {
        code: /a[bc]d/,
    },
];
  
let invalid = [
    {
        code: /a[b]d/, // Noncompliant {{Replace this character class by the character itself.}}
        //      ^^^
    },
    {
        code: /[0]/, // Noncompliant {{Replace this character class by the character itself.}}
        //     ^^^
    },
    {
        code: /[[a]]/, // Noncompliant {{Replace this character class by the character itself.}}
        //      ^^^
    },
    {
        code: /[1-2[3]4-5]/, // Noncompliant {{Replace this character class by the character itself.}}
        //         ^^^
    },
];

  