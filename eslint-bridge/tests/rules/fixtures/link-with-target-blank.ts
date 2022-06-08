window.open("test.html");

window.open("https://example.com/dangerous", "windowname", "noopener");

window.open("https://example.com/dangerous", "windowname", "resizable,scrollbars,status,noopener");

window.open("https://example.com/dangerous"); // Noncompliant {{ Make sure not using "noopener" is safe here. }}
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
window.open("http://example.com/dangerous"); // Noncompliant
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
window.open("https://example.com/dangerous", "windowname", "resizable"); // Noncompliant
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^