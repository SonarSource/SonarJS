window.open('test.html');

window.open('https:/example.com/dangerous1', 'windowname', 'noopener');

window.open('https:/example.com/dangerous2', 'windowname', 'resizable,scrollbars,status,noopener');

window.open('https:/example.com/dangerous3'); // Noncompliant {{Replace this character class by the character itself.}}
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
window.open('http:/example.com/dangerous4'); // Noncompliant
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
window.open('https:/example.com/dangerous5', 'windowname', 'resizable'); // Noncompliant
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
