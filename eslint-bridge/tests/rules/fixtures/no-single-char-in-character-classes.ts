let valid = [
    {
        code: /a[bc]d/,
    },
];
  
let invalid = [
    {
        code: /a[b]d/, // Noncompliant {{Group parts of the regex together to make the intended operator precedence explicit.}}
        //      ^^^
    }    
];
  