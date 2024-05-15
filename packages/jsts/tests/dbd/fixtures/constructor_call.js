class A:
    def __init__(self, x, y):
        self.x = x
        self.y = y


class B:
    def __init__(self, parent=None):
        self.parent = parent


def constructor_call_with_literals():
    return A(42, 666)


def constructor_call_passing_parameters(x: int, y: int):
    return A(x, y)


def constructor_call_missing_one_argument(x: int):
    return A(x)


def constructor_call_without_arguments():
    return A()


def constructor_call_with_keyword_arguments():
    a = A(x=42, y=43)
    a = A(y=43, x=42)
    a = A(x=42)
    a = A(y=43)

def constructor_call_with_default_values():
    b = B()

def unknown_constructor_call():
    c = C()
