import contextlib

class A:
    def __init__(self):
        pass

    def foo(self):
        return 42

    @staticmethod
    def static_method(x, y):
        ...

    @property
    def property_method(x, y):
       ...

    @contextlib.contextmanager
    def contextmanager_method(x, y):
       ...

    @classmethod
    def class_method(cls):
        ...

    @decA
    @decB
    def some_method(self):
        ...


def bound_methods():
    a = A()
    other(a.foo)
    other(a.static_method)
    other(a.prop)
