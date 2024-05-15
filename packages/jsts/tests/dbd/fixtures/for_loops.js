def for_loop(my_list):
    for i in my_list:
        print(i)


def for_loop_return_in_body(my_list):
    for i in my_list:
        print(i)
        return


def for_loop_unknown_iterable():
    for i in unknown:
        print(i)


def for_loop_with_multiple_target(my_list):
    for i, j in my_list:
        print(i)


def for_loop_with_multiple_iterable(my_list_1, my_list_2):
    for i in my_list_1, my_list_2:
        print(i)


def for_loop_with_target_different_than_name(obj, my_list):
    for obj.foo in my_list:
        print(obj.foo)


def for_loop_with_else(my_list):
    for i in my_list:
        print(i)
    else:
        print(42)
