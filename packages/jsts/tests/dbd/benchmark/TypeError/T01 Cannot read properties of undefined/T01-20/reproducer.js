function foo(a) {
	const parts = a.split('/')
	parts[1].split(','); // Noncompliant
}

foo('a');