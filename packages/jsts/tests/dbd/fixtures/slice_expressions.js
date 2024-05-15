def slice_exp():
    l1 = [1, 2, 3, 4, 5]
    l2 = l1[1:3]
    return l2
    
def slice_exp_start():
    l1 = [1, 2, 3, 4, 5]
    l2 = l1[2:]
    return l2
        
def slice_exp_stop():
    l1 = [1, 2, 3, 4, 5]
    l2 = l1[:2]
    return l2
    
def slice_exp_all():
    l1 = [1, 2, 3, 4, 5]
    l2 = l1[:]
    return l2
    
def slice_exp_negative_index():
    l1 = [1, 2, 3, 4, 5]
    l2 = l1[-2:]
    return l2
    
def slice_exp_negative_upper_bound():
    l1 = [1, 2, 3, 4, 5]
    l2 = l1[1:-2]
    return l2

def slice_exp_step():
    l1 = [1, 2, 3, 4, 5]
    l2 = l1[0:4:2]
    return l2
    
def slice_exp_reverse():
    l1 = [1, 2, 3, 4, 5]
    l2 = l1[0:4:-2]
    return l2

def slice_exp_illegal_slice():
    l1 = [1, 2, 3, 4, 5]
    l2 = l1[2.1:4]
    return l2

def slice_exp_illegal_step():
    l1 = [1, 2, 3, 4, 5]
    l2 = l1[0:4:0]
    return l2

def slice_exp_illegal_upper_bound():
    l1 = [1, 2, 3, 4, 5]
    l2 = l1[4:1]
    return l2

def slice_2d_array():
    l1 = [[1,2],[3,4]]
    l2 = l1[:,1]
    return l2

def slice_with_vars(a,b):
    l1 = [1,2, 3,4]
    l2 = l1[a: b]
    return l2

def slice_with_unknown_list(l):
    l2 = l[1:3:2]
    return l2
