window.open('https://example.com/dangerous1'); // Noncompliant {{Make sure not using "noopener" is safe here.}}
    // ^^^^
window.open('http://example.com/dangerous2'); // Noncompliant

window.open('https://example.com/dangerous3', 'windowname', 'resizable'); // Noncompliant

window.open('https://example.com/dangerous4', 'windowname', 123); // Noncompliant

window.open('test.html');

window.open(123);

window.open('https://example.com/dangerous5', 'windowname', 'noopener');

window.open('https://example.com/dangerous6', 'windowname', 'resizable,scrollbars,status,noopener');

window.open('http-protocol-explained.pdf');

function open() {
  console.log('hello');
}
open('https://example.com/dangerous7', 'windowname', 'resizable');

window.notOpen('https://example.com/dangerous8', 'windowname', 'resizable');

const httpUrl = 'https://example.com/dangerous9';
const otherUrl = 'file://whatever';
const requiredOption = 'noopener';
const missingRequiredOption = 'resizable';
const nullVar = null;

window.open(httpUrl, 'windowname', missingRequiredOption); // Noncompliant

window.open(otherUrl, 'windowname', missingRequiredOption);

window.open(httpUrl, 'windowname', requiredOption);

window.open(nullVar, 'windowname', nullVar);

this.window.open('https://example.com/dangerous10', 'windowname', 'resizable'); // Noncompliant

window.open();
