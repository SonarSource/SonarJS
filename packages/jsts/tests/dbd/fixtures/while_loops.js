def basic(i):
    while i < 24:
        print(i)


def while_counting():
    i = 0
    while i < 24:
        i = i + 1
    print(i)

def while_with_return(i):
    while i < 24:
        print(i)
        return


def while_with_break(i):
    while i < 24:
        print(i)
        break


def while_with_continue(i):
    while i < 24:
        print(i)
        continue


def while_with_else():
    while i < 24:
        print(i)
    else:
        print(42)


def nested_while(i, y):
    while i < 24:
        while y < 42:
            print(i)


def nested_while_counting():
    i = 0
    while i < 24:
        j = 0
        while j < 42:
            print(j)
            j = j + 1
        i = i + 1
    print(i)


def while_and_if(i, cond):
    while i < 24:
        if cond:
            print(i)


def while_local_variable():
    i = 0
    x = 0
    while i < 24:
        if i % 2 == 0:
            i = i + 1
            x = x + i
        else:
            x = x - i

def while_and_condition(i, cond):
    while i < 24 and i >= 0:
        i = i + 1
        print(i)

def while_or_condition(i, cond):
    while i < 24 or i >= 0:
        i = i + 1
        print(i)

def for_loop_with_else_and_break(my_list):
    for i in my_list:
        if i == 42:
            break
        print(i)
    else:
        print("But not 42")
    print("done")
