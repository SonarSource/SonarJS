def outer_function():
    outer_var = 1
    another_outer_var = 2
    def inner_function():
        inner_var = outer_var
        return inner_var
    inner_function()

class Box:
    def __init__(self):
        self.x = 0

a = 3
b = Box()
c = 2

# Only a and b should be escaped, and only once
def test_closure_variable_escape():
    global a
    a = 3
    b.x = 2
    b.x = 4
    c = 4
    outer_function()
    d = Box()

