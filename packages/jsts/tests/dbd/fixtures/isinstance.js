import builtins

def is_instance_with_static_type(x: object) -> bool:
    return isinstance(x, int)

def builtins_qualified_is_instance_with_static_type(x):
    return builtins.isinstance(x, int)

def __builtins__qualified_is_instance_with_static_type(x):
    return __builtins__.isinstance(x, int)

def other_qualified_is_instance_with_one_argument(x):
    return other.isinstance(x)

def other_qualified_is_instance_with_two_arguments(x):
    return other.isinstance(x, int)

def is_instance_with_runtime_type(x, t):
     return isinstance(x, t)

def is_instance_with_several_types_is_not_supported(x):
     return isinstance(x, (int, bool, str))

def is_instance_with_tuple_of_size_one_is_not_supported(x):
    return isinstance(x, (int,))

def is_instance_with_parentheses(x):
     return isinstance(x, (int))

def is_instance_with_too_many_parameters(x: object) -> bool:
    return isinstance(x, int, bool)

class A:
    pass

class B(A):
    pass

class C(Unknown):
    pass

def is_instance_with_B(x: A) -> bool:
    return isinstance(x, B)

def is_instance_with_C(x: Unknown) -> bool:
    return isinstance(x, C)

# coverage

a_var = 3
def a_function():
    pass

class D(A,B,B,A,a_var, a_function):
    pass

def is_instance_with_D(x: object) -> bool:
    return isinstance(x, D)
