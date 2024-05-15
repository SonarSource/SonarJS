def if_stmt(param):
    if 1:
        x = 1
    x = 999


def return_in_if():
    if 1:
        return 42
    x = 999

def if_else(param):
    if 1:
        x = 1
    else:
        x = 2
    x = 999

def return_in_else(param):
    if 1:
        x = 1
    else:
        return 2
    x = 999

def return_in_if_and_else(param):
    if 1:
        return 1
    else:
        return 2
    # unreachable
    x = 999

def if_elif_else(param1, param2):
    if 1:
        x = 1
    elif 2:
        x = 2
    else:
        x = 3
    x = 999


def return_in_elif(param1, param2):
    if 1:
        x = 1
    elif 2:
        return 2
    else:
        x = 3
    x = 999

def two_elif(param1, param2):
    if 1:
        x = 1
    elif 2:
        x = 2
    elif 3:
        x = 3
    else:
        x = 4
    x = 999

def if_elif(param1, param2):
    if 1:
        x = 1
    elif 2:
        x = 2
    x = 999


def nested_if():
    if 1:
        if 2:
            x = 1
        x = 2
    x = 999

def condition_as_parameter(condition):
    if condition:
        x = 1
    if not condition:
        x = 2
    if condition:
        x = 999


def foo(param):
  ...

def multiple_assignments(condition):
    if condition:
        x = 1
    else:
        x = 2
    foo(x)


def missing_assignment(condition):
    if condition:
        x = 1
    else:
        y = 42
    foo(x)


def cond_expression(p):
    x = None if p else 42
    x.some


def nested_conditional_expressions(x, y):
    return (
        x + y
        if x > 42
        else x - y
        if 0 != y
        else 0
    )

def if_without_else():
    if 1:
        x = 2
    x = foo(x)
    if y is 3:
        print(y)
