def assign_set_literal():
  s = { 42, 0 }

def set_literal_as_argument():
  print({ 42, 0 })

def assign_dict_literal():
  s = {'k1': 42, 'k2': 0}

def dict_literal_as_argument():
  print({'k1': 42, 'k2': 0})

def empty_dict_literal():
  s = {}

def dict_literal_with_unpacking_on_param(d1):
  d = {'a': 1, **d1}

def tuple_literal_with_unpacking():
  s1 = (1, 2)
  s2 = (3, 4, *s1)

def set_literal_with_unpacking():
  s1 = {1, 2}
  s2 = {3, 4, *s1}

def dict_literal_with_unpacking():
  d1 = {'a': 1, 'b': 2}
  d2 = {'x': 3, 'y': 4}
  print({'e': 5, **d1, 'f': 6, **d2})
