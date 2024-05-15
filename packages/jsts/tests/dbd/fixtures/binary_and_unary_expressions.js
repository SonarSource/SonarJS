def binary(x):
  x is None
  x is not None
  x == None
  x != None

def unary(x):
  not x


def binary_and():
    a = 1
    b = 2
    if a and b:
        x = 1
    else:
        x = 2
    x = 3

def binary_and_chained():
    a = 1
    b = 2
    c = 3
    if a and b and c:
        x = 1
    else:
        x = 2
    x = 3

def binary_or():
    a = 1
    b = 2
    if a or b:
        x = 1
    else:
        x = 2
    x = 3

def binary_or_chained():
    a = 1
    b = 2
    c = 3
    if a or b or c:
        x = 1
    else:
        x = 2
    x = 3


def binary_and_or():
    a = 1
    b = 2
    c = 3
    if a and b or c:
        x = 1
    else:
        x = 2
    x = 3


def nested_is(a, b):
    if a is b is None:
        x = 1
    else:
        x = 2
    x = 3


def nested_is_2(a, b, c, d):
    if a is b is c is d:
        x = 1
    else:
        x = 2
    x = 3


def nested_is_not(a, b):
    if a is b is not None:
        x = 1
    else:
        x = 2
    x = 3

def nested_is_not_2(a, b, c):
    if a is not b is not c:
        x = 1
    else:
        x = 2
    x = 3


def nested_is_assigned_to_variable(x, y, z):
    a = x() is y()
    b = x() is y() is z()


def plus_operator(x, y):
    z = x + y
    return x + y + z


def unpacking_expression(param):
    some_fn(**param)
    some_fn(*param)
    d = { 'k1' : 42, **param}


def binary_and_with_function_call():
    a = 1
    b = 2
    if a and unary(b):
        x = 1
    else:
        x = 2

def if_in(d):
    if 'k1' in d:
        print("k")
    if 'k2' not in d:
        print("k2")


def binary_arithmetic_operators(x, y, z):
    #  plus
    plus = x + y
    plusMultiple = x + y + z

    #  minus
    minus = x - y
    minusMultiple = x - y - z

    # multiply
    multiply = x * y
    multiplyMultiple = x * y * z

    # divide
    divide = x / y
    divideMultiple = x / y / z

    # mod
    mod = x % y
    modMultiple = x % y % z

    # power
    power = x ** y
    powerMultiple = x ** y ** z


def mix_of_binary_arithmetic_operators():
    mix = 5 * 1 + 2 * 3
    mix2 = 3 * 6 / 3
    mix3 = 9 % 5 ** 2
    mix4 = 2 + 3 + 4 + 5 * 3 + 2 + 7



