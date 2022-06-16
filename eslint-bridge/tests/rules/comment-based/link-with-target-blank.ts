window.open('test.html');
window.open(123);

window.open('https://example.com/dangerous1', 'windowname', 'noopener');

window.open('https://example.com/dangerous2', 'windowname', 'resizable,scrollbars,status,noopener');

window.open('https://example.com/dangerous3'); // Noncompliant {{Make sure not using "noopener" is safe here.}}
    // ^^^^
window.open('http://example.com/dangerous4'); // Noncompliant
    // ^^^^
window.open('https://example.com/dangerous5', 'windowname', 'resizable'); // Noncompliant
    // ^^^^
window.open('https://example.com/dangerous5', 'windowname', 123); // Noncompliant
    // ^^^^
    
function open() {
    console.log('hello')
}
open('https://example.com/dangerous5', 'windowname', 'resizable');

window.notOpen('https://example.com/dangerous5', 'windowname', 'resizable');

