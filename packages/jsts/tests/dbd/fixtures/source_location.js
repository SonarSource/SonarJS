from numbers import Rational

def assignments(param):
    if 1:
        x = 2
    c = param.foo(x)
    if y is 3:
        x = 3
    b = isinstance(x, str)
    if y is 4:
        x = 4
    c = Rational(1, 2)
    if y is 5:
        x = 5
    a[i] = x
    if y is 6:
        x = 6
        c.numerator += x
        a[i] += x
    x, y = None, None
    if y is 6:
        x = 6
    x += c

def calls(param):
    if 1:
        x = 2
    param.foo(x)
    if y is 3:
        x = 3
        Rational(3, 4)
    isinstance(x, str)
    if y is 4:
        x = 4
    Rational(1, 2)
