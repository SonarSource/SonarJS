foo('baz')

function foo(token) {
	if (token) {
		return bar(token.value);
	}
}

function bar(value) {
	if (value?.name) {
	}
}
