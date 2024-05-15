def access_param(x):
    x.bar

def access_local_variable():
    x = None
    x.bar

some_global = None

def access_global():
    some_global.bar

def access_return_value():
    x = abs(42)
    x.bar
def chain_of_assignments():
    x = None
    y = x
    y.bar

def access_return_value_and_assignment():
    x = f()
    y = x
    y.foo
