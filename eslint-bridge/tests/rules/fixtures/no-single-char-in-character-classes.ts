let valid = [
    {
        code: /a[bc]d/,
    },
];
  
let invalid = [
    {
        code: /a[b]d/, // Noncompliant {{Replace this character class by the character itself.}}
        //      ^^^
    }    
];
  