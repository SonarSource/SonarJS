
def func():
    a = 10
    b = 20
    c = 30
    d = 30
    e = 50
    rslt = a < b <= c == d != e is not 10
    return rslt

def func2():
    a = 10
    b = 20
    c = 30
    d = 30
    e = 50
    rslt = a < b and b <= c and c == d and d != e and e is not 10
    return rslt

def nested_is_2(a, b, c, d):
    if a is b is c is d:
        x = 1
    else:
        x = 2
    x = 3

def nested_is_assigned_to_variable(x, y, z):
    b = x() is y() is z()
