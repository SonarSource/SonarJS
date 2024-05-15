class Greeter:
    def __init__(self, name):
        self.name = name

    def greet(self):
        return f"Hello {self.name}!"

class Empty:
    pass


class Foo(Greeter):
    ...


class Other(unknown):
    ...


superclasses = [Greeter, Empty]


class Bar(*superclasses):
    ...


def get_super_types():
    return Foo


class Baz(get_super_types()):
    ...
