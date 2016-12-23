"Hello ${name}"; // Noncompliant {{Replace the quotes (") with back-ticks (`).}}
'Hello ${name}'; // Noncompliant {{Replace the quotes (') with back-ticks (`).}}

`Hello ${name}`; // OK
`Hello name`; // OK
`Hello {name}`; // OK

"${"; // OK
"} ${"; // OK
"$   {   } "; // OK
"${foo}}"; // Noncompliant
