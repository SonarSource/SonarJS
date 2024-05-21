function f(x) {
  // ...
}

function g(y) {
  f(42);
  f(...y);
  f({ x: 42 });
  unknown_func();
  Math.random();
}

function qualified_call_to_static_function() {
  Math.random();
}

function ambiguous_call_to_class_method() {
  Date.now();
}

class A {
  constructor() {
    // ...
  }

  foo(x, y, z) {
    // ...
  }

  static bar() {
    // ...
  }

  method_with_default_values(x = 1) {
    // ...
  }

  method_with_args(...args) {
    // ...
  }

  method_with_kwargs(kwargs) {
    // ...
  }

  ambiguous_meth() {
    // ...
  }

  static ambiguous_f() {
    // ...
  }
}

function call_to_instance_method(x, y, z) {
  const a = new A();
  a.foo(x, y, z);
  b.foo();
  a.bar();
  a.ambiguous_meth();
  a.ambiguous_f();
}

function ambiguous_f() {
  // ...
}

function calling_ambiguous_functions() {
  ambiguous_f();
}

function functions_with_kwargs(kwargs) {
  // ...
}

function function_with_args(...args) {
  // ...
}

function function_with_default_value(param = null) {
  // ...
}

function function_with_default_value2(param1, param2 = null, param3 = 42) {
  // ...
}

function calling_functions_with_variadic_arguments() {
  functions_with_kwargs(); // **kwargs is not supported in JavaScript
  function_with_args(); // *args is not supported in JavaScript
  function_with_default_value();
  function_with_default_value(42);
  function_with_default_value2(42, { param3: 1 });
  function_with_default_value2(42, { param3: 1, param2: 2 });
  // We don't have information about this function, it might have variadic arguments
  function_with_unknown_semantic();
  function_with_unknown_semantic();
}

function call_with_incorrect_number_of_args() {
  input("?", 1, 2);
  f();
}

function call_expressions() {
  f(1); // Translated
  function_with_default_value(); // Translated
  function_with_args(1); // Not translated (*args is not supported)
  functions_with_kwargs({ a: 1, b: 2 }); // Not translated (**kwargs is not supported)

  const a = new A(); // Translated
  a.foo(1, 2, 3); // Translated
  a.bar(); // Translated
  a.method_with_default_values(); // Translated
  a.method_with_args(1); // Not translated
  a.method_with_kwargs({ a: 1 }); // Not translated
}

