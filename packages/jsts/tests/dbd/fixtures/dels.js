def del_variable():
    variable = 5
    del variable

def del_tuple():
    tuple = ('test', 30)
    del tuple

def del_list():
    list = [1, 2]
    del list

def del_dictionary():
    dict = {'name':'Bob'}
    del dict

def del_parameter(x):
    del x

def del_object():
    class A:...
    a = A()
    del a

def del_class():
    class A:...
    del A

def del_list_element():
    l1 = [1, 2]
    del l1[0]
    l2 = [1, 2]
    del l2[-1]
    l3 = [1, 2]
    del l3[+1]
    l4 = [1, 2, 3, 4]
    del l4[0:2]
    l5 = [1, 2, 3, 4]
    del l5[-1:-3]
    l6 = [1, 2, 3, 4]
    del l6[:2]
    l7 = [1, 2, 3]
    del l7[:]
    l8 = [1, 2, 3, 4, 5, 6]
    del l8[1:4:2]
    l9 = [1, 2, 3, 4, 5, 6]
    del l9[::2]
    l10 = [1, 2, 3]
    del l10[0], l10[1]

def del_list_unary_op():
    l = [1, 2, 3]
    del l[-1]

def del_list_binary_op():
    l1 = [1, 2, 3]
    del l1[1+1]
    l2 = [1, 2, 3]
    del l2[1-1]

def del_dict_element():
    person = {'name':'Bob', 'age':20}
    del person['age']
