"Hello ${name}"; // Noncompliant {{Replace the quotes (") with back-ticks (`).}}
'Hello ${name}'; // Noncompliant {{Replace the quotes (') with back-ticks (`).}}

`Hello ${name}`; // OK
`Hello name`; // OK
`Hello {name}`; // OK
