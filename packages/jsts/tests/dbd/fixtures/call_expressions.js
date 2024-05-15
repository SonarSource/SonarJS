import random
from datetime import datetime

def f(x):
    ...

def g(y):
    f(42)
    f(*y)
    f(x=42)
    unknown_func()
    random.choice(10, size=42)

def qualified_call_to_static_function():
    random.choice(10)

def ambiguous_call_to_class_method():
    # datetime.now is an ambiguous symbol with 3 alternative symbols. These symbols all represent class methods
    datetime.now()

class A:
    def __init__(self):
        pass

    def foo(self, x, y, z):
        ...
    @staticmethod
    def bar():
        ...

    def method_with_default_values(self, x=1):
        pass

    def method_with_args(self, *args):
        pass

    def method_with_kwargs(self, **kwargs):
        pass

    if SOME:
        def ambiguous_meth(self):
            ...
    else:
        def ambiguous_meth(self, x):
            ...
    if SOME:
        @staticmethod
        def ambiguous_f():
            ...
    else:
        ambiguous_f = 42

def call_to_instance_method(x, y, z):
    a = A()
    a.foo(x, y, z)
    b.foo()
    a.bar()
    a.ambiguous_meth()
    a.ambiguous_f()


if SOME:
    def ambiguous_f():
        ...
else:
    ambiguous_f = 42

def calling_ambiguous_functions():
    ambiguous_f()


def functions_with_kwargs(**kwargs):
    ...


def function_with_args(*args):
    ...


def function_with_default_value(param=None):
    ...


def function_with_default_value2(param1, param2=None, param3=42):
    ...


from other_module.submodule import mod
from other_module.submodule.mod import function_with_unknown_semantic

def calling_functions_with_variadic_arguments():
    functions_with_kwargs()  # **kwargs is not supported
    function_with_args()     # *args is not supported
    function_with_default_value()
    function_with_default_value(42)
    function_with_default_value2(42, param3=1)
    function_with_default_value2(42, param3=1, param2=2)
    # we don't have information about this function, it might have variadic arguments
    mod.function_with_unknown_semantic()
    function_with_unknown_semantic()

def call_with_incorrect_number_of_args():
    input("?", 1, 2)
    f()

def call_expressions():
    f(1)                               # Translated
    function_with_default_value()      # Translated
    function_with_args(1)              # Not translated (*args is not supported)
    functions_with_kwargs(a=1, b=2)    # Not translated (**kwargs is not supported)

    a = A()                            # Translated
    a.foo(1, 2, 3)           # Translated
    a.bar()                            # Translated
    a.method_with_default_values()     # Translated
    a.method_with_args(1)              # Not translated
    a.method_with_kwargs(a=1)          # Not translated
